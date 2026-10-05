# ============================================================
# DIAGRAMME CIRCULAIRE DES STATUTS DE CONSERVATION
# VERSION SERVEUR / DOCKER
#
# Tendances -> Protection nationale -> Statut IUCN
#
# Rscript statuts_conservation.R <input_excel> <output_dir>
#
# Entrée : feuille "Species" avec colonnes
#          Scientific name, Trend, National status, IUCN
# Sorties: diagramme_circulaire_statuts.png / .tiff / .pdf
# ============================================================

rm(list = ls())
graphics.off()
options(stringsAsFactors = FALSE)

# ---------- 1. PACKAGES -------------------------------------
packages <- c("readxl", "dplyr", "stringr", "janitor",
              "igraph", "ggraph", "ggplot2", "scales")

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
  stop("Utilisation : Rscript statuts_conservation.R <input_excel> <output_dir>")
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

needed <- c("scientific_name", "trend", "national_status", "iucn")
if (!all(needed %in% names(df))) {
  stop(paste("ERREUR - Colonnes absentes :",
             paste(setdiff(needed, names(df)), collapse = ", ")))
}

# ---------- 4. EXTRACTION ET HARMONISATION ------------------
dat <- df |>
  dplyr::transmute(
    Espece   = stringr::str_squish(as.character(scientific_name)),
    Tendance = stringr::str_to_lower(stringr::str_squish(as.character(trend))),
    National = stringr::str_to_lower(stringr::str_squish(as.character(national_status))),
    IUCN     = stringr::str_to_upper(stringr::str_squish(as.character(iucn)))
  ) |>
  dplyr::mutate(
    IUCN = dplyr::case_when(
      IUCN %in% c("LC", "LEAST CONCERN", "PRÉOCCUPATION MINEURE",
                  "PREOCCUPATION MINEURE") ~ "LC",
      IUCN %in% c("NT", "NEAR THREATENED", "QUASI MENACÉE",
                  "QUASI MENACEE") ~ "NT",
      IUCN %in% c("VU", "VULNERABLE", "VULNÉRABLE") ~ "VU",
      IUCN %in% c("EN", "ENDANGERED", "EN DANGER") ~ "EN",
      IUCN %in% c("CR", "CRITICALLY ENDANGERED", "EN DANGER CRITIQUE",
                  "EN DANGER CRITIQUE D'EXTINCTION") ~ "CR",
      TRUE ~ NA_character_
    ),
    National = dplyr::case_when(
      stringr::str_detect(National, "^(non|not|un|no)\\b|unprot") ~ "Non protégée",
      stringr::str_detect(National, "prot") ~ "Protégée",
      National %in% c("oui", "yes") ~ "Protégée",
      TRUE ~ NA_character_
    ),
    Tendance = dplyr::case_when(
      stringr::str_detect(Tendance, "increas|augment|croiss|hausse") ~ "Augmentation",
      stringr::str_detect(Tendance, "stable|stabil") ~ "Stable",
      stringr::str_detect(Tendance, "unknown|inconnu|inconnue") ~ "Inconnue",
      stringr::str_detect(Tendance, "decreas|declin|déclin|diminu|baisse") ~ "Déclin",
      TRUE ~ NA_character_
    )
  ) |>
  dplyr::filter(
    !is.na(Espece), Espece != "",
    !is.na(Tendance), !is.na(National), !is.na(IUCN)
  ) |>
  dplyr::distinct(Espece, .keep_all = TRUE)

if (nrow(dat) == 0) stop("ERREUR - Aucune donnée exploitable après nettoyage.")

# ---------- 5. LIENS ----------------------------------------
edges <- dplyr::bind_rows(
  dat |> dplyr::count(Tendance, National, name = "Poids") |>
    dplyr::transmute(from = paste0("TREND_", Tendance),
                     to   = paste0("NAT_", National), Poids),
  dat |> dplyr::count(National, IUCN, name = "Poids") |>
    dplyr::transmute(from = paste0("NAT_", National),
                     to   = paste0("IUCN_", IUCN), Poids)
) |>
  dplyr::filter(Poids > 0)

# ---------- 6. NOEUDS ---------------------------------------
BLEU  <- "#1F83C0"
VERT  <- "#2FAE3D"
ROUGE <- "#E52D2D"

nodes <- dplyr::bind_rows(
  dat |> dplyr::count(Tendance, name = "Effectif") |>
    dplyr::transmute(name = paste0("TREND_", Tendance), Type = "Tendance",
                     Label = Tendance, Effectif),
  dat |> dplyr::count(National, name = "Effectif") |>
    dplyr::transmute(name = paste0("NAT_", National), Type = "National",
                     Label = National, Effectif),
  dat |> dplyr::count(IUCN, name = "Effectif") |>
    dplyr::transmute(name = paste0("IUCN_", IUCN), Type = "IUCN",
                     Label = IUCN, Effectif)
) |>
  dplyr::mutate(
    Groupe = dplyr::case_when(
      Type == "Tendance" ~ "Tendances",
      Type == "National" ~ "Protection nationale",
      TRUE ~ "IUCN"
    ),
    TaillePoint = pmin(3 + 0.95 * sqrt(Effectif), 16)
  )

ordre_noeuds <- c(
  "TREND_Augmentation", "TREND_Inconnue", "TREND_Stable", "TREND_Déclin",
  "IUCN_CR", "IUCN_EN", "IUCN_VU", "IUCN_NT", "IUCN_LC",
  "NAT_Protégée", "NAT_Non protégée"
)
ordre_noeuds <- ordre_noeuds[ordre_noeuds %in% nodes$name]

nodes <- nodes |>
  dplyr::mutate(ordre = match(name, ordre_noeuds)) |>
  dplyr::arrange(ordre)

cat("\nEFFECTIFS ET TAILLES DES CERCLES\n")
print(nodes |> dplyr::select(Type, Label, Effectif, TaillePoint))

# ---------- 7. GRAPHE ET LAYOUT -----------------------------
graph <- igraph::graph_from_data_frame(d = edges, vertices = nodes,
                                       directed = FALSE)

igraph::E(graph)$LargeurLien <- scales::rescale(igraph::E(graph)$Poids,
                                                to = c(0.45, 7))

layout_cercle <- ggraph::create_layout(graph, layout = "circle")

distance_label <- 1.18

layout_cercle <- layout_cercle |>
  dplyr::mutate(
    x_label = x * distance_label,
    y_label = y * distance_label,
    hjust_label = dplyr::case_when(x > 0.15 ~ 0, x < -0.15 ~ 1, TRUE ~ 0.5),
    vjust_label = dplyr::case_when(y > 0.15 ~ 0, y < -0.15 ~ 1, TRUE ~ 0.5)
  )

label_layer <- function(type, colour, size) {
  ggplot2::geom_text(
    data = dplyr::filter(layout_cercle, Type == type),
    ggplot2::aes(x = x_label, y = y_label, label = Label,
                 hjust = hjust_label, vjust = vjust_label),
    colour = colour, size = size, family = "sans", inherit.aes = FALSE
  )
}

# ---------- 8. GRAPHIQUE ------------------------------------
p <- ggraph::ggraph(layout_cercle) +
  ggraph::geom_edge_arc(
    ggplot2::aes(width = LargeurLien),
    colour = "#909090", alpha = 0.60, strength = 0.42,
    lineend = "round", show.legend = FALSE
  ) +
  ggraph::scale_edge_width_identity() +
  ggraph::geom_node_point(
    ggplot2::aes(size = TaillePoint, fill = Groupe),
    shape = 21, colour = "white", stroke = 0.65, alpha = 1,
    show.legend = FALSE
  ) +
  ggplot2::scale_size_identity() +
  ggplot2::scale_fill_manual(values = c(
    "Tendances" = BLEU, "Protection nationale" = VERT, "IUCN" = ROUGE
  )) +
  label_layer("Tendance", BLEU, 4.2) +
  label_layer("National", VERT, 4.3) +
  label_layer("IUCN", ROUGE, 4.3) +
  ggplot2::coord_equal(clip = "off") +
  ggplot2::theme_void() +
  ggplot2::theme(
    plot.background  = ggplot2::element_rect(fill = "white", colour = NA),
    panel.background = ggplot2::element_rect(fill = "white", colour = NA),
    legend.position  = "none",
    plot.margin = ggplot2::margin(t = 80, r = 105, b = 95, l = 105)
  )

# ---------- 9. EXPORTS (noms fixes attendus par le serveur) --
base <- file.path(out_dir, "diagramme_circulaire_statuts")

ggplot2::ggsave(paste0(base, ".png"), p, width = 11, height = 11,
                units = "in", dpi = GRAPHICS_DPI, bg = "white", limitsize = FALSE)
ggplot2::ggsave(paste0(base, ".tiff"), p, width = 11, height = 11,
                units = "in", dpi = GRAPHICS_DPI, compression = "lzw", bg = "white",
                limitsize = FALSE)
ggplot2::ggsave(paste0(base, ".pdf"), p, width = 11, height = 11,
                units = "in", bg = "white", limitsize = FALSE)

utils::write.csv(nodes |> dplyr::select(Type, Label, Effectif),
                 paste0(base, "_effectifs.csv"),
                 row.names = FALSE, fileEncoding = "UTF-8")

expected <- paste0(base, c(".png", ".tiff", ".pdf"))
if (!all(file.exists(expected))) {
  stop("ERREUR - Certains fichiers graphiques n'ont pas été générés.")
}

cat("\nDIAGRAMME TERMINE\n")
cat("Espèces analysées :", dplyr::n_distinct(dat$Espece), "\n")