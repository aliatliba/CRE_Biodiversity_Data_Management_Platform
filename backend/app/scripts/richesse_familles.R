# ============================================================
# RICHESSE AVIFAUNISTIQUE PAR FAMILLE + SILHOUETTES PHYLOPIC
# VERSION SERVEUR / DOCKER
#
# Rscript richesse_familles.R <input_excel> <output_dir>
#
# Entrée : feuille "Species" avec colonnes
#          Class, Order, Family, Genus, Scientific name
# Sorties: richesse_familles.png / .pdf
#
# - Filtre la classe Aves (si la colonne Class est renseignée)
# - 1 barre = 1 famille, hauteur = nombre d'espèces distinctes
# - Classement décroissant
# - Silhouette PhyloPic au-dessus de chaque barre :
#     1) silhouette de la famille
#     2) sinon silhouette d'une espèce de la famille (secours)
# - API PhyloPic v2 via httr2 (requêtes parallèles, sans rphylopic).
#   Les silhouettes sont réduites à SIL_MAX_PX pixels avant mise en
#   cache : ggimage convertit chaque image en matrice de couleurs au
#   rendu, la mémoire croît donc avec le carré de leur taille.
# - Cache disque persistant (GRAPHICS_CACHE_DIR) + dossier "graine"
#   optionnel (phylopic_seed/) livré avec le code, pour que le
#   premier graphique après un déploiement soit rapide et fonctionne
#   même sans accès à PhyloPic.
# ============================================================

rm(list = ls())
graphics.off()
options(stringsAsFactors = FALSE, timeout = 30)

# ---------- 1. PACKAGES -------------------------------------
packages <- c("readxl", "dplyr", "ggplot2", "scales", "httr2", "ggimage")

for (pkg in packages) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    stop(paste0("ERREUR - Le package R '", pkg,
                "' n'est pas installé dans le conteneur."))
  }
  library(pkg, character.only = TRUE)
}

# Résolution des exports raster (la mémoire croît avec le carré du DPI).
# Réduire sur les petites instances : GRAPHICS_DPI=150
GRAPHICS_DPI <- suppressWarnings(as.numeric(Sys.getenv("GRAPHICS_DPI", "300")))
if (is.na(GRAPHICS_DPI) || GRAPHICS_DPI < 72) GRAPHICS_DPI <- 300

# TRUE : si la famille n'a pas de silhouette, essayer une espèce de la famille
UTILISER_ESPECE_SECOURS <- TRUE

# Journal mémoire (visible dans les logs du serveur)
log_mem <- function(tag) {
  st <- tryCatch(readLines("/proc/self/status"), error = function(e) character(0))
  g  <- function(k) {
    l <- st[startsWith(st, k)]
    if (length(l) == 0) "?" else trimws(sub("^[^:]*:", "", l[1]))
  }
  cat(sprintf("[MEM] %-28s RSS=%s  PEAK=%s\n", tag, g("VmRSS:"), g("VmHWM:")))
}

# ---------- 2. ARGUMENTS ------------------------------------
args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 2) {
  stop("Utilisation : Rscript richesse_familles.R <input_excel> <output_dir>")
}
excel_path <- args[1]
out_dir    <- args[2]

if (!file.exists(excel_path)) {
  stop(paste0("ERREUR - Fichier Excel introuvable : ", excel_path))
}
if (!dir.exists(out_dir)) dir.create(out_dir, recursive = TRUE)

log_mem("packages charges")

# ---------- 3. IMPORTATION ----------------------------------
# Petits équivalents en R de base de janitor::clean_names et stringr
# (évite de charger janitor/tidyr/lubridate/stringi : moins de mémoire).
clean_names_base <- function(x) {
  x <- gsub("[^a-z0-9]+", "_", tolower(x))
  gsub("^_+|_+$", "", x)
}
squish <- function(x) trimws(gsub("[[:space:]]+", " ", as.character(x)))
first_words <- function(x, n) {
  vapply(strsplit(x, " ", fixed = TRUE),
         function(p) paste(utils::head(p, n), collapse = " "), character(1))
}

sheets <- readxl::excel_sheets(excel_path)
sheet_to_read <- if ("species" %in% tolower(sheets)) {
  sheets[tolower(sheets) == "species"][1]
} else sheets[1]

df <- readxl::read_excel(excel_path, sheet = sheet_to_read)
names(df) <- clean_names_base(names(df))

# family et scientific_name sont indispensables ; le reste est optionnel
needed <- c("family", "scientific_name")
if (!all(needed %in% names(df))) {
  stop(paste("ERREUR - Colonnes absentes :",
             paste(setdiff(needed, names(df)), collapse = ", ")))
}
for (col in c("class", "order", "genus")) {
  if (!col %in% names(df)) df[[col]] <- NA_character_
}

# ---------- 4. PREPARATION ----------------------------------
invalides <- c("", "NA", "N/A", "N.A.", "NULL", "NONE", "-", "--", "?",
               "UNKNOWN", "NON RENSEIGNE", "NON RENSEIGNÉ")

taxa <- df |>
  dplyr::transmute(
    Classe  = squish(class),
    Ordre   = squish(order),
    Famille = squish(family),
    Genre   = squish(genus),
    Espece  = squish(scientific_name)
  ) |>
  dplyr::mutate(dplyr::across(
    dplyr::everything(),
    ~ dplyr::if_else(is.na(.x) | toupper(.x) %in% invalides,
                     NA_character_, .x)
  ))

rm(df)  # libère la mémoire du tableau brut

# Filtre strict Aves (ignoré si la colonne Class est vide partout)
if (any(!is.na(taxa$Classe))) {
  n_avant <- nrow(taxa)
  taxa <- taxa |> dplyr::filter(tolower(Classe) == "aves")
  cat("Lignes Aves :", nrow(taxa), "/", n_avant, "\n")
  if (nrow(taxa) == 0) {
    stop("ERREUR - Aucune espèce de la classe Aves pour ce site.")
  }
} else {
  cat("Colonne Class vide : filtre Aves ignoré.\n")
}

taxa <- taxa |>
  dplyr::filter(!is.na(Famille), !is.na(Espece)) |>
  # genre manquant -> premier mot du nom scientifique
  dplyr::mutate(Genre = dplyr::coalesce(Genre, first_words(Espece, 1))) |>
  # une espèce = une observation
  dplyr::distinct(Famille, Espece, .keep_all = TRUE)

if (nrow(taxa) == 0) stop("ERREUR - Aucune donnée exploitable.")

richesse <- taxa |>
  dplyr::group_by(Famille) |>
  dplyr::summarise(
    Richesse   = dplyr::n_distinct(Espece),
    # espèce utilisée seulement si la famille n'a pas de silhouette
    Espece_rep = sort(unique(Espece))[1],
    .groups = "drop"
  ) |>
  dplyr::arrange(dplyr::desc(Richesse), Famille)

nb_especes  <- dplyr::n_distinct(taxa$Espece)
nb_ordres   <- dplyr::n_distinct(taxa$Ordre[!is.na(taxa$Ordre)])
nb_familles <- dplyr::n_distinct(taxa$Famille)
nb_genres   <- dplyr::n_distinct(taxa$Genre[!is.na(taxa$Genre)])

cat("Especes  :", nb_especes, "\n")
cat("Ordres   :", nb_ordres, "\n")
cat("Familles :", nb_familles, "\n")
cat("Genres   :", nb_genres, "\n")

rm(taxa)

# ---------- 5. SILHOUETTES PHYLOPIC (API v2) ----------------
# Cache disque persistant + requêtes HTTP en parallèle.
#  - <famille>.png  : silhouette déjà téléchargée (de la famille, ou
#                     à défaut d'une espèce de la famille)
#  - <famille>.none : PhyloPic n'a rien trouvé (re-testé après 30 jours)
# Les erreurs réseau ne sont jamais mises en cache : elles seront
# réessayées au prochain lancement.

t0 <- Sys.time()

cache_root <- Sys.getenv(
  "GRAPHICS_CACHE_DIR",
  unset = file.path(tempdir(), "graphics_cache")
)
cache_dir <- file.path(cache_root, "phylopic")
dir.create(cache_dir, showWarnings = FALSE, recursive = TRUE)

API          <- "https://api.phylopic.org"
NEG_TTL_DAYS <- 30
SIL_MAX_PX   <- 192   # taille max (px) des silhouettes mises en cache
MAX_ACTIVE   <- 8

safe_name <- function(x) gsub("[^A-Za-z0-9]", "_", x)
png_path  <- function(x) file.path(cache_dir, paste0(safe_name(x), ".png"))
none_path <- function(x) file.path(cache_dir, paste0(safe_name(x), ".none"))

mark_none <- function(x) invisible(file.create(none_path(x)))

has_fresh_none <- function(x) {
  f  <- none_path(x)
  ok <- file.exists(f)
  if (any(ok)) {
    age <- as.numeric(difftime(Sys.time(), file.mtime(f[ok]), units = "days"))
    ok[ok] <- age < NEG_TTL_DAYS
  }
  ok
}

# --- Cache "graine" : PNG livrés avec le code (optionnel) -----
# Dossier : <dossier du script>/phylopic_seed  (ou PHYLOPIC_SEED_DIR).
# Les fichiers absents du cache y sont copiés au démarrage.
script_dir <- tryCatch({
  f <- sub("^--file=", "", grep("^--file=", commandArgs(FALSE), value = TRUE))
  if (length(f) > 0) dirname(normalizePath(f[1])) else getwd()
}, error = function(e) getwd())

seed_dir <- Sys.getenv("PHYLOPIC_SEED_DIR",
                       unset = file.path(script_dir, "phylopic_seed"))
if (dir.exists(seed_dir)) {
  seeds <- list.files(seed_dir, pattern = "\\.png$", full.names = TRUE)
  seeds <- seeds[!file.exists(file.path(cache_dir, basename(seeds)))]
  if (length(seeds) > 0) {
    file.copy(seeds, cache_dir)
    cat("Silhouettes copiées depuis le dossier graine :", length(seeds), "\n")
  }
}

# numéro de build de l'API (requis par PhyloPic v2)
phylopic_build <- tryCatch({
  b <- httr2::request(paste0(API, "/")) |>
    httr2::req_timeout(10) |>
    httr2::req_perform() |>
    httr2::resp_body_json()
  b$build
}, error = function(e) NULL)

api_req <- function(path, ...) {
  httr2::request(paste0(API, path)) |>
    httr2::req_url_query(build = phylopic_build, ...) |>
    httr2::req_timeout(15) |>
    httr2::req_retry(max_tries = 2) |>
    httr2::req_error(is_error = function(resp) FALSE)  # pas d'exception sur 4xx/5xx
}

# exécute les requêtes en parallèle ; NULL = échec (réseau ou statut != 200)
perform_json <- function(reqs) {
  if (length(reqs) == 0) return(list())
  resps <- httr2::req_perform_parallel(
    reqs, on_error = "continue", max_active = MAX_ACTIVE, progress = FALSE
  )
  lapply(resps, function(r) {
    if (inherits(r, "httr2_response") && httr2::resp_status(r) == 200) {
      tryCatch(httr2::resp_body_json(r), error = function(e) NULL)
    } else NULL
  })
}

# fichier raster dont la largeur est la plus proche de SIL_MAX_PX
# (les silhouettes sont dessinées à ~0.6 pouce : ~190 px suffisent)
pick_raster <- function(files) {
  if (length(files) == 0) return(NA_character_)
  widths <- vapply(files, function(f) {
    s <- if (is.null(f$sizes)) "" else as.character(f$sizes)[1]
    w <- suppressWarnings(as.numeric(strsplit(s, "x")[[1]][1]))
    if (length(w) == 0 || is.na(w)) 0 else w
  }, numeric(1))
  href <- files[[which.min(abs(widths - SIL_MAX_PX))]]$href
  if (is.null(href)) NA_character_ else href
}

# Réduit une silhouette trop grande (TRUE si elle a été modifiée).
# Traite aussi les fichiers déjà en cache : sans cela une image de
# 512-1024 px fait exploser la mémoire au rendu (ggimage).
shrink_png <- function(path) {
  if (!requireNamespace("magick", quietly = TRUE)) return(FALSE)
  tryCatch({
    img  <- magick::image_read(path)
    info <- magick::image_info(img)
    if (max(info$width, info$height) <= SIL_MAX_PX) return(FALSE)
    img <- magick::image_resize(img, paste0(SIL_MAX_PX, "x", SIL_MAX_PX))
    magick::image_write(img, path = path, format = "png")
    TRUE
  }, error = function(e) FALSE)
}

# Cherche une image PhyloPic pour chaque nom (famille ou espèce).
# Retourne, pour chaque nom :
#   status "ok"    + href de l'image
#   status "none"  : PhyloPic n'a rien (définitif)
#   status "error" : échec réseau (à réessayer plus tard)
find_images <- function(terms) {
  n      <- length(terms)
  href   <- rep(NA_character_, n)
  status <- rep("error", n)
  if (n == 0) return(list(href = href, status = status))

  # --- Étape 1 : recherche des noeuds (parallèle) -------------
  node_json <- perform_json(lapply(terms, function(t) {
    api_req("/nodes", filter_name = tolower(t),
            embed_items = "true", page = 0)
  }))

  uuid <- rep(NA_character_, n)
  for (i in seq_len(n)) {
    js <- node_json[[i]]
    if (is.null(js)) next                       # échec réseau
    items <- js[["_embedded"]][["items"]]
    if (length(items) == 0) { status[i] <- "none"; next }
    exact <- Filter(function(it) {
      any(tolower(unlist(it$names)) == tolower(terms[i]))
    }, items)
    chosen <- if (length(exact) > 0) exact[[1]] else items[[1]]
    uuid[i] <- chosen$uuid
  }

  # --- Étape 2 : image principale de chaque noeud (parallèle) -
  idx <- which(!is.na(uuid))
  if (length(idx) == 0) return(list(href = href, status = status))

  node_img <- perform_json(lapply(idx, function(i) {
    api_req(paste0("/nodes/", uuid[i]), embed_primaryImage = "true")
  }))

  need_clade <- integer(0)
  for (k in seq_along(idx)) {
    i  <- idx[k]
    js <- node_img[[k]]
    if (is.null(js)) next
    img <- js[["_embedded"]][["primaryImage"]]
    h <- if (!is.null(img)) pick_raster(img[["_links"]][["rasterFiles"]]) else NA_character_
    if (!is.na(h)) {
      href[i] <- h; status[i] <- "ok"
    } else {
      need_clade <- c(need_clade, i)
    }
  }

  # --- Étape 2b : pas d'image propre -> image d'un descendant -
  if (length(need_clade) > 0) {
    clade_json <- perform_json(lapply(need_clade, function(i) {
      api_req("/images", filter_clade = uuid[i],
              embed_items = "true", page = 0)
    }))
    for (k in seq_along(need_clade)) {
      i  <- need_clade[k]
      js <- clade_json[[k]]
      if (is.null(js)) next
      items <- js[["_embedded"]][["items"]]
      h <- if (length(items) > 0) {
        pick_raster(items[[1]][["_links"]][["rasterFiles"]])
      } else NA_character_
      if (is.na(h)) {
        status[i] <- "none"
      } else {
        href[i] <- h; status[i] <- "ok"
      }
    }
  }

  list(href = href, status = status)
}

families <- as.character(richesse$Famille)
todo <- families[!file.exists(png_path(families)) & !has_fresh_none(families)]

cat("Silhouettes en cache :", sum(file.exists(png_path(families))),
    "| absentes de PhyloPic (cache) :", sum(has_fresh_none(families)),
    "| à rechercher :", length(todo), "\n")

if (length(todo) > 0 && is.null(phylopic_build)) {
  cat("PhyloPic injoignable : seules les silhouettes en cache sont utilisées.\n")
}

if (length(todo) > 0 && !is.null(phylopic_build)) {

  # --- Passe 1 : silhouette de la famille ---------------------
  r1     <- find_images(todo)
  href   <- r1$href
  status <- r1$status

  # --- Passe 2 : espèce représentative (secours) --------------
  if (UTILISER_ESPECE_SECOURS) {
    fb <- which(status == "none")
    if (length(fb) > 0) {
      esp <- richesse$Espece_rep[match(todo[fb], families)]
      esp <- first_words(esp, 2)                 # binomial : "Genre espece"
      r2  <- find_images(esp)
      href[fb]   <- r2$href
      status[fb] <- r2$status
      cat("Secours par espèce :", sum(r2$status == "ok"), "/", length(fb), "\n")
    }
  }

  # familles pour lesquelles PhyloPic n'a vraiment rien
  for (i in which(status == "none")) mark_none(todo[i])

  # --- Étape 3 : téléchargement des PNG (parallèle) -----------
  dl <- which(!is.na(href))

  if (length(dl) > 0) {
    tmp <- paste0(png_path(todo[dl]), ".part")
    reqs <- lapply(href[dl], function(u) {
      httr2::request(u) |>
        httr2::req_timeout(30) |>
        httr2::req_retry(max_tries = 2) |>
        httr2::req_error(is_error = function(resp) FALSE)
    })
    resps <- httr2::req_perform_parallel(
      reqs, paths = tmp, on_error = "continue",
      max_active = MAX_ACTIVE, progress = FALSE
    )
    for (k in seq_along(dl)) {
      ok <- inherits(resps[[k]], "httr2_response") &&
        httr2::resp_status(resps[[k]]) == 200 &&
        file.exists(tmp[k]) && file.size(tmp[k]) > 0
      if (ok) file.rename(tmp[k], png_path(todo[dl[k]])) else unlink(tmp[k])
    }
  }
}

have_png <- families[file.exists(png_path(families))]
n_shrunk <- sum(vapply(png_path(have_png), shrink_png, logical(1)))
cat("Silhouettes réduites à", SIL_MAX_PX, "px max :", n_shrunk, "\n")
invisible(gc())

richesse$Silhouette <- ifelse(file.exists(png_path(families)),
                              png_path(families), NA_character_)

cat("Silhouettes utilisées :", sum(!is.na(richesse$Silhouette)),
    "/", nrow(richesse),
    "(", round(as.numeric(difftime(Sys.time(), t0, units = "secs"))), "s )\n")

log_mem("apres silhouettes")

# ---------- 6. GRAPHIQUE ------------------------------------
VERT_BARRE   <- "#69A93F"
VERT_CONTOUR <- "#4E832F"
ROUGE_TITRE  <- "#D41414"
GRIS_TEXTE   <- "#7B7B7B"
GRIS_GRILLE  <- "#D9D9D9"

max_richesse <- max(richesse$Richesse)

richesse <- richesse |>
  dplyr::mutate(Position_silhouette = Richesse + max_richesse * 0.45 / 16)

richesse$Famille <- factor(richesse$Famille, levels = richesse$Famille)

p <- ggplot2::ggplot(richesse, ggplot2::aes(x = Famille, y = Richesse)) +
  ggplot2::geom_col(width = 0.52, fill = VERT_BARRE,
                    colour = VERT_CONTOUR, linewidth = 0.7)

silhouettes_ok <- richesse |> dplyr::filter(!is.na(Silhouette))

if (nrow(silhouettes_ok) > 0) {
  p <- p +
    ggimage::geom_image(
      data = silhouettes_ok,
      ggplot2::aes(x = Famille, y = Position_silhouette, image = Silhouette),
      size = 0.040, asp = 1, inherit.aes = FALSE
    )
}

stats_lignes <- c(
  if (nb_ordres > 0) paste0(nb_ordres, " Ordres"),
  paste0(nb_familles, " Familles"),
  paste0(nb_genres, " Genres")
)
texte_stats <- paste(stats_lignes, collapse = "\n\n")

p <- p +
  ggplot2::annotate(
    "text", x = length(levels(richesse$Famille)) + 0.4,
    y = max_richesse * 1.03, label = texte_stats,
    hjust = 1, vjust = 1, colour = GRIS_TEXTE,
    fontface = "bold", size = 5.2, lineheight = 1.5
  ) +
  ggplot2::scale_y_continuous(
    limits = c(0, max_richesse * 1.12),
    breaks = scales::pretty_breaks(n = 8),
    expand = ggplot2::expansion(mult = c(0, 0))
  ) +
  ggplot2::labs(title = "Richesse avifaunistique", x = NULL, y = NULL) +
  ggplot2::theme_minimal(base_size = 12) +
  ggplot2::theme(
    plot.background  = ggplot2::element_rect(fill = "white", colour = NA),
    panel.background = ggplot2::element_rect(fill = "white", colour = NA),
    plot.title = ggplot2::element_text(colour = ROUGE_TITRE, size = 22,
                                       face = "bold", hjust = 0.5,
                                       margin = ggplot2::margin(b = 18)),
    panel.grid.major.x = ggplot2::element_blank(),
    panel.grid.minor   = ggplot2::element_blank(),
    panel.grid.major.y = ggplot2::element_line(colour = GRIS_GRILLE,
                                               linewidth = 0.65),
    axis.text.x = ggplot2::element_text(angle = 50, hjust = 1, vjust = 1,
                                        colour = "#555555", size = 10),
    axis.text.y = ggplot2::element_text(colour = "#555555", size = 9),
    axis.ticks  = ggplot2::element_blank(),
    panel.border = ggplot2::element_blank(),
    legend.position = "none",
    plot.margin = ggplot2::margin(25, 40, 50, 20)
  )

log_mem("graphique construit")

# ---------- 7. EXPORTS (noms fixes attendus par le serveur) --
base <- file.path(out_dir, "richesse_familles")

invisible(gc())   # libère le maximum avant l'export raster

ggplot2::ggsave(paste0(base, ".png"), p, width = 15, height = 8.5,
                units = "in", dpi = GRAPHICS_DPI, bg = "white", limitsize = FALSE)
log_mem("apres export PNG")
invisible(gc())

ggplot2::ggsave(paste0(base, ".pdf"), p, width = 15, height = 8.5,
                units = "in", bg = "white", limitsize = FALSE)
log_mem("apres export PDF")

expected <- paste0(base, c(".png", ".pdf"))
if (!all(file.exists(expected))) {
  stop("ERREUR - Certains fichiers graphiques n'ont pas été générés.")
}

cat("\nGRAPHIQUE RICHESSE TERMINE\n")