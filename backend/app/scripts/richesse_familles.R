# ============================================================
# RICHESSE TAXONOMIQUE PAR FAMILLE + SILHOUETTES PHYLOPIC
# VERSION SERVEUR / DOCKER
#
# Rscript richesse_familles.R <input_excel> <output_dir>
#
# Entrée : feuille "Species" avec colonnes
#          Order, Family, Genus, Scientific name
# Sorties: richesse_familles.png / .pdf
#
# Les silhouettes sont récupérées via l'API PhyloPic v2, avec cache
# disque (variable d'environnement GRAPHICS_CACHE_DIR) et requêtes
# parallèles. Si l'API est injoignable, le graphique est produit
# avec les silhouettes en cache, ou sans silhouettes.
# ============================================================

rm(list = ls())
graphics.off()
options(stringsAsFactors = FALSE, timeout = 30)

# ---------- 1. PACKAGES -------------------------------------
packages <- c("readxl", "dplyr", "stringr", "janitor",
              "ggplot2", "scales", "httr2", "ggimage")

for (pkg in packages) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    stop(paste0("ERREUR - Le package R '", pkg,
                "' n'est pas installé dans le conteneur."))
  }
  library(pkg, character.only = TRUE)
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

# ---------- 3. IMPORTATION ----------------------------------
sheets <- readxl::excel_sheets(excel_path)
sheet_to_read <- if ("species" %in% tolower(sheets)) {
  sheets[tolower(sheets) == "species"][1]
} else sheets[1]

df <- readxl::read_excel(excel_path, sheet = sheet_to_read) |>
  janitor::clean_names()

needed <- c("order", "family", "genus", "scientific_name")
if (!all(needed %in% names(df))) {
  stop(paste("ERREUR - Colonnes absentes :",
             paste(setdiff(needed, names(df)), collapse = ", ")))
}

# ---------- 4. PREPARATION ----------------------------------
invalides <- c("", "NA", "N/A", "-", "--", "?")

taxa <- df |>
  dplyr::transmute(
    Ordre   = stringr::str_squish(as.character(order)),
    Famille = stringr::str_squish(as.character(family)),
    Genre   = stringr::str_squish(as.character(genus)),
    Espece  = stringr::str_squish(as.character(scientific_name))
  ) |>
  dplyr::mutate(dplyr::across(
    dplyr::everything(),
    ~ dplyr::if_else(is.na(.x) | toupper(.x) %in% invalides,
                     NA_character_, .x)
  )) |>
  dplyr::filter(!is.na(Famille), !is.na(Espece)) |>
  dplyr::distinct(Famille, Espece, .keep_all = TRUE)

if (nrow(taxa) == 0) stop("ERREUR - Aucune donnée exploitable.")

richesse <- taxa |>
  dplyr::group_by(Famille) |>
  dplyr::summarise(Richesse = dplyr::n_distinct(Espece), .groups = "drop") |>
  dplyr::arrange(dplyr::desc(Richesse), Famille)

nb_ordres   <- dplyr::n_distinct(taxa$Ordre[!is.na(taxa$Ordre)])
nb_familles <- dplyr::n_distinct(taxa$Famille)
nb_genres   <- dplyr::n_distinct(taxa$Genre[!is.na(taxa$Genre)])

cat("Ordres   :", nb_ordres, "\n")
cat("Familles :", nb_familles, "\n")
cat("Genres   :", nb_genres, "\n")

# ---------- 5. SILHOUETTES PHYLOPIC (API v2) ----------------
# Cache disque persistant + requêtes HTTP en parallèle.
#  - <famille>.png  : silhouette déjà téléchargée
#  - <famille>.none : PhyloPic n'a pas de silhouette (re-testé après 30 jours)
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

# fichier raster dont la largeur est la plus proche de 512 px
pick_raster <- function(files) {
  if (length(files) == 0) return(NA_character_)
  widths <- vapply(files, function(f) {
    w <- suppressWarnings(as.numeric(strsplit(f$sizes, "x")[[1]][1]))
    if (is.na(w)) 0 else w
  }, numeric(1))
  files[[which.min(abs(widths - 512))]]$href
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

  # --- Étape 1 : recherche des noeuds (parallèle) -------------
  node_json <- perform_json(lapply(todo, function(f) {
    api_req("/nodes", filter_name = tolower(f),
            embed_items = "true", page = 0)
  }))

  node_uuid <- rep(NA_character_, length(todo))
  for (i in seq_along(todo)) {
    js <- node_json[[i]]
    if (is.null(js)) next                       # échec réseau : on réessaiera
    items <- js[["_embedded"]][["items"]]
    if (length(items) == 0) { mark_none(todo[i]); next }
    exact <- Filter(function(it) {
      any(tolower(unlist(it$names)) == tolower(todo[i]))
    }, items)
    chosen <- if (length(exact) > 0) exact[[1]] else items[[1]]
    node_uuid[i] <- chosen$uuid
  }

  # --- Étape 2 : image principale de chaque noeud (parallèle) -
  img_href <- rep(NA_character_, length(todo))
  idx <- which(!is.na(node_uuid))

  if (length(idx) > 0) {
    node_img <- perform_json(lapply(idx, function(i) {
      api_req(paste0("/nodes/", node_uuid[i]), embed_primaryImage = "true")
    }))

    for (k in seq_along(idx)) {
      js <- node_img[[k]]
      if (is.null(js)) next
      img <- js[["_embedded"]][["primaryImage"]]
      if (!is.null(img)) {
        img_href[idx[k]] <- pick_raster(img[["_links"]][["rasterFiles"]])
      }
    }

    # --- Étape 2b : pas d'image propre -> image d'un descendant -
    need_clade <- idx[vapply(seq_along(idx), function(k) {
      !is.null(node_img[[k]]) && is.na(img_href[idx[k]])
    }, logical(1))]

    if (length(need_clade) > 0) {
      clade_json <- perform_json(lapply(need_clade, function(i) {
        api_req("/images", filter_clade = node_uuid[i],
                embed_items = "true", page = 0)
      }))
      for (k in seq_along(need_clade)) {
        js <- clade_json[[k]]
        i  <- need_clade[k]
        if (is.null(js)) next
        items <- js[["_embedded"]][["items"]]
        if (length(items) > 0) {
          img_href[i] <- pick_raster(items[[1]][["_links"]][["rasterFiles"]])
        }
        if (is.na(img_href[i])) mark_none(todo[i])
      }
    }
  }

  # --- Étape 3 : téléchargement des PNG (parallèle) -----------
  dl <- which(!is.na(img_href))

  if (length(dl) > 0) {
    tmp <- paste0(png_path(todo[dl]), ".part")
    reqs <- lapply(img_href[dl], function(u) {
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

richesse$Silhouette <- ifelse(file.exists(png_path(families)),
                              png_path(families), NA_character_)

cat("Silhouettes utilisées :", sum(!is.na(richesse$Silhouette)),
    "/", nrow(richesse),
    "(", round(as.numeric(difftime(Sys.time(), t0, units = "secs"))), "s )\n")

# ---------- 6. GRAPHIQUE ------------------------------------
max_richesse <- max(richesse$Richesse)

richesse <- richesse |>
  dplyr::mutate(Position_silhouette = Richesse + max_richesse * 0.45 / 16)

richesse$Famille <- factor(richesse$Famille, levels = richesse$Famille)

p <- ggplot2::ggplot(richesse, ggplot2::aes(x = Famille, y = Richesse)) +
  # ombre
  ggplot2::geom_col(width = 0.56, fill = "#233326", alpha = 0.10,
                    position = ggplot2::position_nudge(x = 0.045),
                    show.legend = FALSE) +
  # barres
  ggplot2::geom_col(width = 0.56, fill = "#579B38", colour = NA) +
  # reflets
  ggplot2::geom_col(ggplot2::aes(y = Richesse * 0.99), width = 0.11,
                    fill = "white", alpha = 0.14,
                    position = ggplot2::position_nudge(x = -0.14),
                    show.legend = FALSE) +
  ggplot2::geom_col(ggplot2::aes(y = Richesse * 0.99), width = 0.18,
                    fill = "white", alpha = 0.045,
                    position = ggplot2::position_nudge(x = 0.02),
                    show.legend = FALSE)

silhouettes_ok <- richesse |> dplyr::filter(!is.na(Silhouette))

if (nrow(silhouettes_ok) > 0) {
  p <- p +
    ggimage::geom_image(
      data = silhouettes_ok,
      ggplot2::aes(x = Famille, y = Position_silhouette, image = Silhouette),
      size = 0.040, asp = 1, inherit.aes = FALSE
    )
}

texte_stats <- paste0(nb_ordres, " Ordres\n\n",
                      nb_familles, " Familles\n\n",
                      nb_genres, " Genres")

p <- p +
  ggplot2::annotate(
    "text", x = length(levels(richesse$Famille)) + 0.4,
    y = max_richesse * 1.03, label = texte_stats,
    hjust = 1, vjust = 1, colour = "#777777",
    fontface = "bold", size = 4.7, lineheight = 1.5
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
    plot.title = ggplot2::element_text(colour = "#C00000", size = 22,
                                       face = "bold", hjust = 0.5,
                                       margin = ggplot2::margin(b = 15)),
    panel.grid.major.x = ggplot2::element_blank(),
    panel.grid.minor   = ggplot2::element_blank(),
    panel.grid.major.y = ggplot2::element_line(colour = "#D7D7D7",
                                               linewidth = 0.5),
    axis.text.x = ggplot2::element_text(angle = 48, hjust = 1, vjust = 1,
                                        colour = "#555555", size = 9),
    axis.text.y = ggplot2::element_text(colour = "#555555", size = 9),
    axis.ticks  = ggplot2::element_blank(),
    panel.border = ggplot2::element_blank(),
    plot.margin = ggplot2::margin(20, 45, 35, 30)
  )

# ---------- 7. EXPORTS (noms fixes attendus par le serveur) --
base <- file.path(out_dir, "richesse_familles")

ggplot2::ggsave(paste0(base, ".png"), p, width = 15, height = 8.5,
                units = "in", dpi = 300, bg = "white", limitsize = FALSE)
ggplot2::ggsave(paste0(base, ".pdf"), p, width = 15, height = 8.5,
                units = "in", bg = "white", limitsize = FALSE)

expected <- paste0(base, c(".png", ".pdf"))
if (!all(file.exists(expected))) {
  stop("ERREUR - Certains fichiers graphiques n'ont pas été générés.")
}

cat("\nGRAPHIQUE RICHESSE TERMINE\n")