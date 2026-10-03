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
# Les silhouettes sont récupérées via l'API PhyloPic v2.
# Si l'API est injoignable, le graphique est produit sans silhouettes.
# ============================================================

rm(list = ls())
graphics.off()
options(stringsAsFactors = FALSE, timeout = 30)

# ---------- 1. PACKAGES -------------------------------------
packages <- c("readxl", "dplyr", "stringr", "janitor",
              "ggplot2", "scales", "jsonlite", "ggimage")

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
silhouette_dir <- file.path(tempdir(), "phylopic_silhouettes")
dir.create(silhouette_dir, showWarnings = FALSE, recursive = TRUE)

API <- "https://api.phylopic.org"

fetch_json <- function(url) jsonlite::fromJSON(url, simplifyVector = FALSE)

phylopic_build <- tryCatch(fetch_json(API)$build, error = function(e) NULL)

if (is.null(phylopic_build)) {
  cat("PhyloPic injoignable : graphique sans silhouettes.\n")
}

# choisit le fichier raster dont la largeur est la plus proche de 512 px
pick_raster <- function(files) {
  if (length(files) == 0) return(NA_character_)
  widths <- vapply(files, function(f) {
    w <- suppressWarnings(as.numeric(strsplit(f$sizes, "x")[[1]][1]))
    if (is.na(w)) 0 else w
  }, numeric(1))
  files[[which.min(abs(widths - 512))]]$href
}

get_phylopic <- function(taxon_name) {
  if (is.null(phylopic_build)) return(NA_character_)

  tryCatch({
    # 1) noeud correspondant au nom
    nodes <- fetch_json(paste0(
      API, "/nodes?build=", phylopic_build,
      "&filter_name=", utils::URLencode(tolower(taxon_name), reserved = TRUE),
      "&embed_items=true&page=0"
    ))
    items <- nodes[["_embedded"]][["items"]]
    if (length(items) == 0) return(NA_character_)
    node_uuid <- items[[1]]$uuid

    # 2) image principale du noeud
    node <- fetch_json(paste0(
      API, "/nodes/", node_uuid,
      "?build=", phylopic_build, "&embed_primaryImage=true"
    ))
    img <- node[["_embedded"]][["primaryImage"]]
    if (is.null(img)) return(NA_character_)

    href <- pick_raster(img[["_links"]][["rasterFiles"]])
    if (is.na(href)) return(NA_character_)

    out <- file.path(silhouette_dir,
                     paste0(gsub("[^A-Za-z0-9]", "_", taxon_name), ".png"))
    utils::download.file(href, out, mode = "wb", quiet = TRUE)
    if (file.exists(out)) out else NA_character_
  }, error = function(e) NA_character_)
}

richesse$Silhouette <- vapply(richesse$Famille, get_phylopic, character(1))
cat("Silhouettes trouvées :", sum(!is.na(richesse$Silhouette)),
    "/", nrow(richesse), "\n")

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
