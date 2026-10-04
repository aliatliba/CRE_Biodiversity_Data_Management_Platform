# ============================================================
# GRAPHIQUE DES CATEGORIES UICN - VERSION SERVEUR / DOCKER
#
# Rscript iucn_conservation.R <input_excel> <output_dir>
#
# Entrée : feuille "Species" avec colonnes
#          "Scientific name" et "IUCN"
# Sorties: graphique_uicn.png / .tiff / .pdf
# ============================================================

rm(list = ls())
graphics.off()
options(stringsAsFactors = FALSE)

# ---------- 1. PACKAGES (installés au build de l'image) -----
packages <- c("readxl", "dplyr", "stringr", "janitor",
              "ggplot2", "scales", "ggchicklet")

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

# ---------- 2. ARGUMENTS ------------------------------------
args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 2) {
  stop("Utilisation : Rscript iucn_conservation.R <input_excel> <output_dir>")
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

if (!all(c("iucn", "scientific_name") %in% names(df))) {
  stop("ERREUR - Colonnes 'IUCN' et 'Scientific name' requises.")
}

# ---------- 4. PREPARATION ----------------------------------
ordre_iucn <- c("LC", "NT", "VU", "EN", "CR")

data_iucn <- df |>
  dplyr::transmute(
    Espece = stringr::str_squish(as.character(scientific_name)),
    Statut = stringr::str_to_upper(stringr::str_squish(as.character(iucn)))
  ) |>
  dplyr::mutate(
    Statut = dplyr::case_when(
      Statut %in% c("LC", "LEAST CONCERN", "PREOCCUPATION MINEURE",
                    "PRÉOCCUPATION MINEURE") ~ "LC",
      Statut %in% c("NT", "NEAR THREATENED", "QUASI MENACEE",
                    "QUASI MENACÉE") ~ "NT",
      Statut %in% c("VU", "VULNERABLE", "VULNÉRABLE") ~ "VU",
      Statut %in% c("EN", "ENDANGERED", "EN DANGER") ~ "EN",
      Statut %in% c("CR", "CRITICALLY ENDANGERED", "EN DANGER CRITIQUE",
                    "EN DANGER CRITIQUE D'EXTINCTION") ~ "CR",
      TRUE ~ Statut
    )
  ) |>
  dplyr::filter(!is.na(Statut), Statut %in% ordre_iucn) |>
  dplyr::distinct(Espece, Statut, .keep_all = TRUE)

effectifs <- data_iucn |>
  dplyr::count(Statut, name = "Nombre") |>
  dplyr::filter(Nombre > 0) |>
  dplyr::mutate(ordre = match(Statut, ordre_iucn)) |>
  dplyr::arrange(ordre) |>
  dplyr::select(-ordre)

if (nrow(effectifs) == 0) {
  stop("ERREUR - Aucune catégorie LC, NT, VU, EN ou CR n'a été trouvée.")
}

categories_presentes <- ordre_iucn[ordre_iucn %in% effectifs$Statut]
effectifs$Statut <- factor(effectifs$Statut, levels = categories_presentes)
max_n <- max(effectifs$Nombre)

# ---------- 5. PALETTE ET LIBELLES --------------------------
palette_iucn <- c(LC = "#59C653", NT = "#C9E214", VU = "#FFE000",
                  EN = "#FF7A3D", CR = "#D81E05")

labels_iucn <- c(LC = "Préoccupation\nmineure", NT = "Quasi\nmenacée",
                 VU = "Vulnérable", EN = "En danger",
                 CR = "En danger critique\nd'extinction")

labels_x <- paste0(categories_presentes, "\n", labels_iucn[categories_presentes])
names(labels_x) <- categories_presentes

# ---------- 6. GRAPHIQUE ------------------------------------
p <- ggplot2::ggplot(effectifs, ggplot2::aes(x = Statut, y = Nombre)) +

  # ombre
  ggchicklet::geom_chicklet(
    width = 0.47, fill = "#334155", alpha = 0.065,
    radius = grid::unit(3, "pt"),
    position = ggplot2::position_nudge(x = 0.035), show.legend = FALSE) +

  # barres
  ggchicklet::geom_chicklet(
    ggplot2::aes(fill = Statut), width = 0.47,
    radius = grid::unit(3, "pt"), colour = NA, show.legend = FALSE) +

  # reflets
  ggplot2::geom_col(
    ggplot2::aes(y = Nombre * 0.995), width = 0.065, fill = "white",
    alpha = 0.13, position = ggplot2::position_nudge(x = -0.13),
    show.legend = FALSE) +
  ggplot2::geom_col(
    ggplot2::aes(y = Nombre * 0.995), width = 0.16, fill = "white",
    alpha = 0.055, position = ggplot2::position_nudge(x = 0.015),
    show.legend = FALSE) +

  # valeurs
  ggplot2::geom_text(
    ggplot2::aes(label = Nombre, y = Nombre + max_n * 0.028),
    colour = "#172033", size = 4.1, fontface = "bold",
    show.legend = FALSE) +

  ggplot2::scale_fill_manual(values = palette_iucn[categories_presentes],
                             drop = TRUE, guide = "none") +

  # légende à pastilles rondes
  ggplot2::geom_point(
    ggplot2::aes(colour = Statut), y = 0, shape = 16, size = 4,
    alpha = 0, show.legend = TRUE) +
  ggplot2::scale_colour_manual(
    values = palette_iucn[categories_presentes],
    breaks = categories_presentes, limits = categories_presentes,
    drop = TRUE, name = "Catégories UICN") +
  ggplot2::guides(colour = ggplot2::guide_legend(
    title.position = "top", title.hjust = 0.5, nrow = 1, byrow = TRUE,
    override.aes = list(shape = 16, size = 5.3, alpha = 1))) +

  ggplot2::scale_x_discrete(labels = labels_x, drop = TRUE) +
  ggplot2::scale_y_continuous(
    limits = c(0, max_n * 1.12), breaks = scales::pretty_breaks(n = 6),
    expand = ggplot2::expansion(mult = c(0, 0))) +

  ggplot2::labs(
    title = "Statut de conservation des espèces",
    subtitle = "Répartition selon les catégories de la Liste rouge de l’UICN",
    x = NULL, y = "Nombre d'espèces") +

  ggplot2::theme_minimal(base_size = 14) +
  ggplot2::theme(
    plot.background  = ggplot2::element_rect(fill = "#F6F8FB", colour = NA),
    panel.background = ggplot2::element_rect(fill = "#F6F8FB", colour = NA),
    plot.title    = ggplot2::element_text(colour = "#172033", size = 24,
                                          face = "bold", hjust = 0,
                                          margin = ggplot2::margin(b = 5)),
    plot.subtitle = ggplot2::element_text(colour = "#77869C", size = 14,
                                          hjust = 0,
                                          margin = ggplot2::margin(b = 30)),
    panel.grid.major.x = ggplot2::element_blank(),
    panel.grid.minor   = ggplot2::element_blank(),
    panel.grid.major.y = ggplot2::element_line(colour = "#E1E6ED",
                                               linewidth = 0.45),
    axis.text.x  = ggplot2::element_text(colour = "#334155", size = 11.5,
                                         face = "bold", lineheight = 1.05,
                                         margin = ggplot2::margin(t = 13)),
    axis.ticks.x = ggplot2::element_blank(),
    axis.title.x = ggplot2::element_blank(),
    axis.text.y  = ggplot2::element_text(colour = "#7D8CA1", size = 10.5),
    axis.title.y = ggplot2::element_text(colour = "#334155", size = 12,
                                         face = "bold",
                                         margin = ggplot2::margin(r = 15)),
    axis.ticks.y = ggplot2::element_blank(),
    axis.line    = ggplot2::element_blank(),
    panel.border = ggplot2::element_blank(),
    legend.position      = "top",
    legend.justification = "right",
    legend.direction     = "horizontal",
    legend.title = ggplot2::element_text(colour = "#334155", size = 10.5,
                                         face = "bold"),
    legend.text  = ggplot2::element_text(colour = "#263238", size = 10.5),
    legend.key   = ggplot2::element_rect(fill = NA, colour = NA),
    legend.spacing.x = grid::unit(0.25, "cm"),
    plot.margin = ggplot2::margin(t = 18, r = 30, b = 25, l = 30)
  ) +
  ggplot2::geom_hline(yintercept = 0, colour = "#CBD3DD", linewidth = 0.55,
                      show.legend = FALSE)

# ---------- 7. EXPORTS (noms fixes attendus par le serveur) --
base <- file.path(out_dir, "graphique_uicn")
bg   <- "#F6F8FB"

ggplot2::ggsave(paste0(base, ".png"),  p, width = 13, height = 7.5,
                units = "in", dpi = GRAPHICS_DPI, bg = bg, limitsize = FALSE)
ggplot2::ggsave(paste0(base, ".tiff"), p, width = 13, height = 7.5,
                units = "in", dpi = GRAPHICS_DPI, compression = "lzw", bg = bg,
                limitsize = FALSE)
ggplot2::ggsave(paste0(base, ".pdf"),  p, width = 13, height = 7.5,
                units = "in", bg = bg, limitsize = FALSE)

expected <- paste0(base, c(".png", ".tiff", ".pdf"))
if (!all(file.exists(expected))) {
  stop("ERREUR - Certains fichiers graphiques n'ont pas été générés.")
}

cat("\nGRAPHIQUE UICN TERMINE\n")
cat("Catégories présentes : ", paste(categories_presentes, collapse = " | "), "\n")
print(effectifs)