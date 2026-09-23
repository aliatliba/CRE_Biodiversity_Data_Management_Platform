# ============================================================
#
# DENDROGRAMME TAXONOMIQUE CIRCULAIRE
#
# VERSION FINALE - NOUVEAU JEU DE DONNEES
#
# Structure attendue :
#
# Kingdom -> Class -> Order -> Family -> Genus -> Scientific name
#
# REPRESENTATION :
#
# - Aucun nom scientifique affiché
# - Aucun point aux niveaux internes
# - Uniquement les points terminaux
# - Points colorés selon la CLASSE
# - Branches gris foncé
# - NA / valeurs non renseignées exclus
# - Anomalies de la colonne Class exclues
# - Légende des classes complètement à droite
# - Titre générique : aucune référence à Oum Lahnach
# - Export PNG / TIFF / PDF haute résolution
#
# VERSION SERVEUR / DOCKER
#
# Le fichier Excel et le dossier de sortie sont fournis
# comme arguments :
#
# Rscript dendrogramme_taxonomique.R <input_excel> <output_dir>
#
# ============================================================


# ============================================================
# 0. NETTOYAGE DE L'ENVIRONNEMENT R
# ============================================================

rm(list = ls())

graphics.off()

options(stringsAsFactors = FALSE)

options(timeout = 600)


# ============================================================
# 1. PACKAGES
# ============================================================

# IMPORTANT :
# Les packages sont installés dans l'image Docker.
# Aucun install.packages() n'est exécuté au runtime.

packages <- c(
  "readxl",
  "dplyr",
  "stringr",
  "ggplot2",
  "ggraph",
  "igraph",
  "scales",
  "writexl"
)

for (pkg in packages) {

  if (!requireNamespace(pkg, quietly = TRUE)) {

    stop(
      paste0(
        "ERREUR - Le package R '",
        pkg,
        "' n'est pas installé dans le conteneur."
      )
    )

  }

  library(pkg, character.only = TRUE)
}


# ============================================================
# 2. ARGUMENTS DU SERVEUR
# ============================================================

args <- commandArgs(trailingOnly = TRUE)

if (length(args) < 2) {

  stop(
    paste0(
      "\nERREUR - Arguments manquants.\n\n",
      "Utilisation :\n",
      "Rscript dendrogramme_taxonomique.R ",
      "<input_excel> <output_dir>\n"
    )
  )

}

excel_path <- args[1]

out_dir <- args[2]


# ============================================================
# 3. VERIFICATION DU FICHIER EXCEL
# ============================================================

if (!file.exists(excel_path)) {

  stop(
    paste0(
      "\nERREUR - Le fichier Excel n'existe pas :\n",
      excel_path
    )
  )

}

if (file.info(excel_path)$isdir) {

  stop(
    paste0(
      "\nERREUR - Le chemin fourni est un dossier et non un fichier :\n",
      excel_path
    )
  )

}


cat("\n")

cat("====================================================\n")

cat("FICHIER UTILISE POUR LE GRAPHIQUE\n")

cat("====================================================\n")

cat(
  basename(excel_path),
  "\n"
)

cat("====================================================\n\n")


# ============================================================
# 4. IDENTIFICATION DE LA FEUILLE
# ============================================================

sheets <- readxl::excel_sheets(excel_path)

if (length(sheets) == 0) {

  stop(
    "\nERREUR - Aucune feuille Excel trouvée."
  )

}

cat("Feuilles disponibles :\n")

print(sheets)


# Chercher Species sans être sensible aux majuscules

species_sheet <- sheets[
  tolower(sheets) == "species"
]


if (length(species_sheet) >= 1) {

  sheet_to_read <- species_sheet[1]

} else {

  cat("\nLa feuille 'Species' n'a pas été trouvée.\n")

  cat(
    "La première feuille sera utilisée : ",
    sheets[1],
    "\n"
  )

  sheet_to_read <- sheets[1]

}


cat(
  "\nFeuille utilisée : ",
  sheet_to_read,
  "\n",
  sep = ""
)


# ============================================================
# 5. IMPORTATION
# ============================================================

df <- readxl::read_excel(
  excel_path,
  sheet = sheet_to_read
)


# ============================================================
# 5.1 REMPLACEMENT DE janitor::clean_names()
# ============================================================

# Cette fonction reproduit le comportement nécessaire de
# janitor::clean_names() pour les colonnes utilisées ici,
# sans installer janitor au runtime.

clean_column_names <- function(x) {

  x <- as.character(x)

  # Conversion en minuscules
  x <- tolower(x)

  # Remplacement des caractères non alphanumériques
  # par des underscores
  x <- gsub(
    "[^a-z0-9]+",
    "_",
    x
  )

  # Suppression des underscores au début et à la fin
  x <- gsub(
    "^_+|_+$",
    "",
    x
  )

  # Suppression des underscores consécutifs
  x <- gsub(
    "_+",
    "_",
    x
  )

  return(x)
}


names(df) <- clean_column_names(names(df))


cat("\n")

cat("====================================================\n")

cat("CONTROLE DU FICHIER IMPORTE\n")

cat("====================================================\n")

cat(
  "Nombre de lignes importées :",
  nrow(df),
  "\n"
)

cat(
  "Nombre de colonnes :",
  ncol(df),
  "\n\n"
)

cat("Colonnes détectées :\n")

print(names(df))


# ============================================================
# 6. VERIFICATION DES COLONNES TAXONOMIQUES
# ============================================================

colonnes_requises <- c(
  "kingdom",
  "class",
  "order",
  "family",
  "genus",
  "scientific_name"
)


colonnes_absentes <- setdiff(
  colonnes_requises,
  names(df)
)


if (length(colonnes_absentes) > 0) {

  stop(
    paste(
      "\nERREUR - Colonnes absentes :",
      paste(
        colonnes_absentes,
        collapse = ", "
      )
    )
  )

}


# ============================================================
# 7. EXTRACTION DES DONNEES TAXONOMIQUES
# ============================================================

taxo <- df |>

  dplyr::transmute(

    Kingdom =
      stringr::str_squish(
        as.character(kingdom)
      ),

    Classe =
      stringr::str_squish(
        as.character(class)
      ),

    Ordre =
      stringr::str_squish(
        as.character(order)
      ),

    Famille =
      stringr::str_squish(
        as.character(family)
      ),

    Genre =
      stringr::str_squish(
        as.character(genus)
      ),

    Espece =
      stringr::str_squish(
        as.character(scientific_name)
      )

  )


# ============================================================
# 8. NETTOYAGE DES VALEURS MANQUANTES
# ============================================================

valeurs_invalides <- c(

  "",

  "na",

  "n/a",

  "nan",

  "null",

  "none",

  "-",

  "--",

  "?",

  "non renseigné",

  "non renseigne",

  "non renseignée",

  "non renseignee",

  "non identifié",

  "non identifie",

  "non identifiée",

  "non identifiee",

  "unknown",

  "inconnu",

  "inconnue",

  "indet",

  "indet.",

  "indéterminé",

  "indetermine",

  "not available",

  "not assigned"

)


clean_missing <- function(x) {

  x <- stringr::str_squish(
    as.character(x)
  )

  x_lower <- stringr::str_to_lower(x)

  invalide <-
    is.na(x) |
    x_lower %in% valeurs_invalides

  x[invalide] <- NA_character_

  return(x)
}


taxo <- taxo |>

  dplyr::mutate(

    dplyr::across(
      everything(),
      clean_missing
    )

  )


# ============================================================
# 9. ELIMINATION DES FAUSSES CLASSES
#
# Evite par exemple :
#
# "Phylum"
# "Class"
# "Non renseigné"
# etc.
# ============================================================

classes_anormales <- c(

  "phylum",

  "embranchement",

  "kingdom",

  "règne",

  "regne",

  "class",

  "classe",

  "order",

  "ordre",

  "family",

  "famille",

  "genus",

  "genre",

  "species",

  "espèce",

  "espece",

  "scientific name",

  "scientific_name",

  "taxon",

  "taxa"

)


taxo <- taxo |>

  dplyr::filter(

    !is.na(Kingdom),

    !is.na(Classe),

    !(
      stringr::str_to_lower(Classe)
      %in%
      classes_anormales
    )

  )


# ============================================================
# 10. TRAITEMENT DES RANGS TAXONOMIQUES MANQUANTS
#
# IMPORTANT :
#
# On ne remplace PAS les données par celles d'un autre site.
#
# Les rangs manquants sous une classe valide sont conservés
# avec des identifiants techniques propres afin que le taxon
# puisse rester représenté.
# ============================================================

taxo <- taxo |>

  dplyr::mutate(

    Ordre =
      dplyr::if_else(

        is.na(Ordre),

        paste0(
          "Ordre_non_renseigne_",
          Classe
        ),

        Ordre

      ),

    Famille =
      dplyr::if_else(

        is.na(Famille),

        paste0(
          "Famille_non_renseignee_",
          Ordre
        ),

        Famille

      ),

    Genre =
      dplyr::if_else(

        is.na(Genre),

        paste0(
          "Genre_non_renseigne_",
          Famille
        ),

        Genre

      ),

    Espece =
      dplyr::case_when(

        is.na(Espece) ~

          paste0(
            Genre,
            "_taxon_terminal"
          ),

        stringr::str_to_lower(Espece)
        %in%
        c(
          "sp",
          "sp.",
          "spp",
          "spp."
        ) ~

          paste0(
            Genre,
            "_taxon_terminal"
          ),

        TRUE ~

          Espece

      )

  )


# ============================================================
# 11. SUPPRESSION DES DOUBLONS
# ============================================================

taxo <- taxo |>

  dplyr::distinct(

    Kingdom,

    Classe,

    Ordre,

    Famille,

    Genre,

    Espece

  )


# ============================================================
# 12. TRI TAXONOMIQUE
#
# Ce tri améliore fortement l'organisation du cercle :
# les espèces d'une même classe restent regroupées.
# ============================================================

taxo <- taxo |>

  dplyr::arrange(

    Kingdom,

    Classe,

    Ordre,

    Famille,

    Genre,

    Espece

  )


# ============================================================
# 13. CONTROLE DES CLASSES CONSERVEES
# ============================================================

controle_classes <- taxo |>

  dplyr::count(

    Classe,

    name = "Nombre_taxons"

  ) |>

  dplyr::arrange(

    dplyr::desc(Nombre_taxons)

  )


cat("\n")

cat("====================================================\n")

cat("CLASSES CONSERVEES\n")

cat("====================================================\n\n")

print(controle_classes)


# ============================================================
# 14. VERIFICATION : DONNEES DISPONIBLES
# ============================================================

if (nrow(taxo) == 0) {

  stop(
    paste0(
      "\nERREUR - Aucun taxon valide ne reste après ",
      "le nettoyage des données."
    )
  )

}


# ============================================================
# 15. CREATION DES IDENTIFIANTS HIERARCHIQUES
#
# Les identifiants sont uniques :
# aucun risque de mélanger deux familles ou genres homonymes.
# ============================================================

taxo <- taxo |>

  dplyr::mutate(

    Kingdom_ID =
      paste0(
        "K|",
        Kingdom
      ),

    Classe_ID =
      paste0(
        Kingdom_ID,
        "|C|",
        Classe
      ),

    Ordre_ID =
      paste0(
        Classe_ID,
        "|O|",
        Ordre
      ),

    Famille_ID =
      paste0(
        Ordre_ID,
        "|F|",
        Famille
      ),

    Genre_ID =
      paste0(
        Famille_ID,
        "|G|",
        Genre
      ),

    Espece_ID =
      paste0(
        Genre_ID,
        "|S|",
        Espece
      )

  )


# ============================================================
# 16. CREATION DES ARETES
# ============================================================

edges_taxo <- dplyr::bind_rows(

  taxo |>
    dplyr::transmute(
      from = Kingdom_ID,
      to = Classe_ID
    ),

  taxo |>
    dplyr::transmute(
      from = Classe_ID,
      to = Ordre_ID
    ),

  taxo |>
    dplyr::transmute(
      from = Ordre_ID,
      to = Famille_ID
    ),

  taxo |>
    dplyr::transmute(
      from = Famille_ID,
      to = Genre_ID
    ),

  taxo |>
    dplyr::transmute(
      from = Genre_ID,
      to = Espece_ID
    )

) |>

  dplyr::distinct()


# ============================================================
# 17. CREATION DES NOEUDS
# ============================================================

nodes_taxo <- dplyr::bind_rows(

  taxo |>
    dplyr::transmute(

      name = Kingdom_ID,

      label = Kingdom,

      niveau = "Kingdom",

      classe = NA_character_

    ),

  taxo |>
    dplyr::transmute(

      name = Classe_ID,

      label = Classe,

      niveau = "Class",

      classe = Classe

    ),

  taxo |>
    dplyr::transmute(

      name = Ordre_ID,

      label = Ordre,

      niveau = "Order",

      classe = Classe

    ),

  taxo |>
    dplyr::transmute(

      name = Famille_ID,

      label = Famille,

      niveau = "Family",

      classe = Classe

    ),

  taxo |>
    dplyr::transmute(

      name = Genre_ID,

      label = Genre,

      niveau = "Genus",

      classe = Classe

    ),

  taxo |>
    dplyr::transmute(

      name = Espece_ID,

      label = Espece,

      niveau = "Species",

      classe = Classe

    )

) |>

  dplyr::distinct(

    name,

    .keep_all = TRUE

  )


# ============================================================
# 18. CONTROLE DES DOUBLONS DE NOEUDS
# ============================================================

if (anyDuplicated(nodes_taxo$name) > 0) {

  stop(
    "Erreur : des identifiants de noeuds sont dupliqués."
  )

}


# ============================================================
# 19. CREATION DU GRAPHE
# ============================================================

graph_taxo <- igraph::graph_from_data_frame(

  d = edges_taxo,

  vertices = nodes_taxo,

  directed = TRUE

)


# ============================================================
# 20. PALETTE DES CLASSES
#
# Couleurs utilisées UNIQUEMENT pour les points terminaux.
# ============================================================

classes <- sort(
  unique(
    taxo$Classe
  )
)


palette_base <- c(

  "#0072B2",

  "#D55E00",

  "#009E73",

  "#CC79A7",

  "#E69F00",

  "#56B4E9",

  "#6A3D9A",

  "#1B9E77",

  "#B15928",

  "#7570B3",

  "#E7298A",

  "#66A61E",

  "#A6761D",

  "#00A6D6",

  "#8C564B",

  "#17BECF",

  "#BCBD22",

  "#9467BD",

  "#2CA02C",

  "#C44E52"

)


if (
  length(classes) <=
  length(palette_base)
) {

  palette_classes <-
    palette_base[
      seq_along(classes)
    ]

} else {

  palette_classes <-
    scales::hue_pal(
      l = 58,
      c = 95
    )(
      length(classes)
    )

}


names(palette_classes) <- classes


# ============================================================
# 21. LAYOUT CIRCULAIRE
# ============================================================

layout_taxo <- ggraph::create_layout(

  graph_taxo,

  layout = "dendrogram",

  circular = TRUE

)


# ============================================================
# 22. TAXONS TERMINAUX
# ============================================================

terminaux <- layout_taxo |>

  dplyr::filter(

    niveau == "Species",

    !is.na(classe)

  ) |>

  dplyr::filter(
    classe %in% classes
  )


# ============================================================
# 23. INFORMATION SUR LES TAXONS TERMINAUX
# ============================================================

cat("\n")

cat("====================================================\n")

cat("TAXONS TERMINAUX REPRESENTES\n")

cat("====================================================\n")

cat(
  "Nombre de taxons terminaux : ",
  nrow(terminaux),
  "\n",
  sep = ""
)

cat(
  "Nombre de classes : ",
  length(classes),
  "\n",
  sep = ""
)


# ============================================================
# 24. GRAPHIQUE
# ============================================================

p_taxo <- ggraph(layout_taxo) +

  # ----------------------------------------------------------
  # BRANCHES
  # ----------------------------------------------------------

  ggraph::geom_edge_diagonal(

    colour = "grey35",

    linewidth = 0.32,

    alpha = 0.70,

    lineend = "round"

  ) +

  # ----------------------------------------------------------
  # UNIQUEMENT LES POINTS TERMINAUX
  # ----------------------------------------------------------

  ggplot2::geom_point(

    data = terminaux,

    ggplot2::aes(

      x = x,

      y = y,

      colour = classe

    ),

    inherit.aes = FALSE,

    size = 4.2,

    alpha = 1,

    show.legend = TRUE

  ) +

  # ----------------------------------------------------------
  # COULEURS PAR CLASSE
  # ----------------------------------------------------------

  ggplot2::scale_colour_manual(

    values = palette_classes,

    breaks = classes,

    limits = classes,

    drop = TRUE,

    na.translate = FALSE,

    name = "Classe"

  ) +

  # ----------------------------------------------------------
  # GEOMETRIE
  # ----------------------------------------------------------

  ggplot2::coord_fixed(
    clip = "off"
  ) +

  # ----------------------------------------------------------
  # THEME
  # ----------------------------------------------------------

  ggplot2::theme_void(
    base_size = 12
  ) +

  ggplot2::theme(

    plot.background =
      ggplot2::element_rect(
        fill = "white",
        colour = NA
      ),

    panel.background =
      ggplot2::element_rect(
        fill = "white",
        colour = NA
      ),

    legend.position =
      "right",

    legend.justification =
      "center",

    legend.box =
      "vertical",

    legend.margin =
      ggplot2::margin(
        l = 25
      ),

    legend.title =
      ggplot2::element_text(
        face = "bold",
        size = 17,
        colour = "grey15"
      ),

    legend.text =
      ggplot2::element_text(
        size = 15,
        colour = "grey20"
      ),

        legend.key =
          ggplot2::element_blank(),

        legend.key.height =
          grid::unit(
            0.75,
            "cm"
          ),

    legend.spacing.y =
      grid::unit(
        0.15,
        "cm"
      ),

    plot.title =
      ggplot2::element_text(

        face = "bold",

        size = 19,

        hjust = 0.5,

        colour = "#1F2937",

        margin =
          ggplot2::margin(
            b = 4
          )

      ),

    plot.subtitle =
      ggplot2::element_text(

        size = 10.5,

        hjust = 0.5,

        colour = "#6B7280",

        margin =
          ggplot2::margin(
            b = 20
          )

      ),

    plot.margin =
      ggplot2::margin(

        t = 35,

        r = 70,

        b = 35,

        l = 35

      )

  ) +

  # ----------------------------------------------------------
  # TITRE GENERIQUE
  # ----------------------------------------------------------

  ggplot2::labs(

    title =
      "Dendrogramme circulaire taxonomique de la biocénose",

    subtitle =
      "Organisation hiérarchique : Règne → Classe → Ordre → Famille → Genre → Espèce"

  )


# ============================================================
# 25. AFFICHAGE
# ============================================================

print(p_taxo)   


# ============================================================
# 26. CREATION DU DOSSIER DE SORTIE
#
# Le dossier est fourni par le backend Python.
# ============================================================

if (!dir.exists(out_dir)) {

  dir.create(
    out_dir,
    recursive = TRUE
  )

}


if (!dir.exists(out_dir)) {

  stop(
    paste0(
      "ERREUR - Impossible de créer le dossier de sortie : ",
      out_dir
    )
  )

}


# ============================================================
# 27. NOM DES FICHIERS
# ============================================================

base_name <-
  tools::file_path_sans_ext(
    basename(excel_path)
  )


# ============================================================
# 28. EXPORT PNG 600 DPI
# ============================================================

png_file <- file.path(
  out_dir,
  "dendrogramme_circulaire.png"
)


ggplot2::ggsave(

  filename = png_file,

  plot = p_taxo,

  width = 18,

  height = 15,

  units = "in",

  dpi = 600,

  bg = "white",

  limitsize = FALSE

)


# ============================================================
# 29. EXPORT TIFF 600 DPI
# ============================================================

tiff_file <- file.path(
  out_dir,
  "dendrogramme_circulaire.tiff"
)


ggplot2::ggsave(

  filename = tiff_file,

  plot = p_taxo,

  width = 18,

  height = 15,

  units = "in",

  dpi = 600,

  compression = "lzw",

  bg = "white",

  limitsize = FALSE

)


# ============================================================
# 30. EXPORT PDF VECTORIEL
# ============================================================

pdf_file <- file.path(
  out_dir,
  "dendrogramme_circulaire.pdf"
)


ggplot2::ggsave(

  filename = pdf_file,

  plot = p_taxo,

  width = 18,

  height = 15,

  units = "in",

  bg = "white",

  limitsize = FALSE

)


# ============================================================
# 31. VERIFICATION DES FICHIERS GRAPHIQUES
# ============================================================

expected_graphics <- c(
  png_file,
  tiff_file,
  pdf_file
)


missing_graphics <- expected_graphics[
  !file.exists(expected_graphics)
]


if (length(missing_graphics) > 0) {

  stop(
    paste0(
      "ERREUR - Certains fichiers graphiques n'ont pas ",
      "été générés : ",
      paste(
        missing_graphics,
        collapse = ", "
      )
    )
  )

}


# ============================================================
# 32. RESUME TAXONOMIQUE
# ============================================================

resume_taxonomique <- data.frame(

  Rang = c(

    "Règnes",

    "Classes",

    "Ordres",

    "Familles",

    "Genres",

    "Taxons terminaux"

  ),

  Nombre = c(

    dplyr::n_distinct(
      taxo$Kingdom
    ),

    dplyr::n_distinct(
      taxo$Classe
    ),

    dplyr::n_distinct(
      taxo$Ordre
    ),

    dplyr::n_distinct(
      taxo$Famille
    ),

    dplyr::n_distinct(
      taxo$Genre
    ),

    nrow(taxo)

  )

)


# ============================================================
# 33. EXPORT DU TABLEAU DE CONTROLE
# ============================================================

control_excel <- file.path(
  out_dir,
  paste0(
    base_name,
    "_controle_taxonomique.xlsx"
  )
)


writexl::write_xlsx(

  list(

    "Taxonomie nettoyee" =

      taxo |>

      dplyr::select(

        Kingdom,

        Classe,

        Ordre,

        Famille,

        Genre,

        Espece

      ),

    "Classes" =
      controle_classes,

    "Resume" =
      resume_taxonomique

  ),

  control_excel

)


# ============================================================
# 34. VERIFICATION DU TABLEAU DE CONTROLE
# ============================================================

if (!file.exists(control_excel)) {

  stop(
    paste0(
      "ERREUR - Le fichier de contrôle n'a pas été créé : ",
      control_excel
    )
  )

}


# ============================================================
# 35. AFFICHAGE DU RESUME
# ============================================================

cat("\n")

cat("====================================================\n")

cat("RESUME TAXONOMIQUE DU NOUVEAU FICHIER\n")

cat("====================================================\n\n")

print(resume_taxonomique)


cat("\nRépartition par classe :\n\n")

print(controle_classes)


# ============================================================
# 36. MESSAGE FINAL
# ============================================================

cat("\n")

cat("====================================================\n")

cat("DENDROGRAMME TERMINE AVEC SUCCES\n")

cat("====================================================\n\n")


cat(
  "Fichier source : ",
  basename(excel_path),
  "\n",
  sep = ""
)


cat(
  "Feuille : ",
  sheet_to_read,
  "\n",
  sep = ""
)


cat(
  "Nombre de taxons terminaux : ",
  nrow(taxo),
  "\n",
  sep = ""
)


cat(
  "Nombre de classes : ",
  length(classes),
  "\n",
  sep = ""
)


cat("\nDossier de sortie :\n")

cat(
  out_dir,
  "\n"
)


cat("\nFichiers produits :\n")

cat(
  "- dendrogramme_circulaire.png\n"
)

cat(
  "- dendrogramme_circulaire.tiff\n"
)

cat(
  "- dendrogramme_circulaire.pdf\n"
)

cat(
  "- ",
  basename(control_excel),
  "\n",
  sep = ""
)


cat("\n====================================================\n")