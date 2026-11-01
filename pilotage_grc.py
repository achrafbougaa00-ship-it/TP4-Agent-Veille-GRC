import json
from pathlib import Path

import pandas as pd
import streamlit as st


BASE = Path(__file__).resolve().parent
DOSSIER = BASE / "src" / "resultats"


def charger_csv(nom_fichier):
    chemin = DOSSIER / nom_fichier

    if not chemin.exists():
        return pd.DataFrame()

    return pd.read_csv(
        chemin,
        sep=";",
        encoding="utf-8-sig",
        dtype=str,
        keep_default_na=False
    )


def afficher_pilotage_grc():

    st.title("📈 Pilotage GRC et échéances")

    st.write(
        "Tableau de bord de suivi des obligations réglementaires, "
        "des risques et des actions correctives."
    )

    # ======================================
    # CHARGEMENT DES DONNÉES
    # ======================================

    m2 = charger_csv("M2_impact.csv")
    m4 = charger_csv("M4_risques.csv")

    if m2.empty and m4.empty:
        st.warning(
            "Aucune donnée disponible. "
            "Générez d'abord les matrices GRC."
        )
        return

    # ======================================
    # INDICATEURS
    # ======================================

    st.subheader("📊 Indicateurs de pilotage")

    obligations = set()

    for df in [m2, m4]:
        if "ID obligation" in df.columns:
            obligations.update(
                df["ID obligation"].dropna().tolist()
            )

    nombre_obligations = len(obligations)
    nombre_risques = len(m4)

    if "Criticite" in m4.columns:
        risques_non_evalues = (
            m4["Criticite"]
            .str.contains("Non évalu", case=False, na=False)
            .sum()
        )
    else:
        risques_non_evalues = 0

    if "Responsable" in m4.columns:
        responsables_a_designer = (
            m4["Responsable"]
            .str.contains("À désigner", case=False, na=False)
            .sum()
        )
    else:
        responsables_a_designer = 0

    col1, col2, col3, col4 = st.columns(4)

    col1.metric("📋 Obligations distinctes", nombre_obligations)
    col2.metric("⚠️ Risques recensés", nombre_risques)
    col3.metric("🔍 Risques non évalués", int(risques_non_evalues))
    col4.metric("👤 Responsables à désigner", int(responsables_a_designer))

    st.divider()

    # ======================================
    # RISQUES
    # ======================================

    st.subheader("⚠️ Registre des risques")

    if not m4.empty:
        st.dataframe(
            m4,
            use_container_width=True,
            hide_index=True
        )

        st.download_button(
            "⬇️ Télécharger le registre des risques",
            data=m4.to_csv(
                sep=";",
                index=False
            ).encode("utf-8-sig"),
            file_name="registre_risques_grc.csv",
            mime="text/csv"
        )

    # ======================================
    # ÉVALUATION DES RISQUES
    # ======================================

    st.subheader("📊 État des évaluations")

    if "Criticite" in m4.columns and not m4.empty:

        repartition = (
            m4["Criticite"]
            .value_counts()
            .rename_axis("Criticité")
            .reset_index(name="Nombre")
        )

        st.bar_chart(
            repartition.set_index("Criticité")["Nombre"]
        )

    st.divider()

    # ======================================
    # IMPACTS
    # ======================================

    st.subheader("📋 Analyse des impacts")

    if not m2.empty:
        st.dataframe(
            m2,
            use_container_width=True,
            hide_index=True
        )

    # ======================================
    # ACTIONS CORRECTIVES
    # ======================================

    st.subheader("🛠️ Plan d'actions correctives")

    colonnes_actions = [
        "ID obligation",
        "Risque",
        "Action corrective",
        "Responsable",
        "Statut"
    ]

    if not m4.empty:

        colonnes_disponibles = [
            col for col in colonnes_actions
            if col in m4.columns
        ]

        st.dataframe(
            m4[colonnes_disponibles],
            use_container_width=True,
            hide_index=True
        )

    # ======================================
    # ÉCHÉANCES
    # ======================================

    st.subheader("📅 Échéances réglementaires")

    st.info(
        "Les matrices actuelles ne contiennent pas de colonne "
        "d'échéance réglementaire. "
        "Les échéances seront affichées lorsqu'elles "
        "seront disponibles dans les données."
    )

    st.divider()

    st.warning(
        "⚖️ Les évaluations de risques et les actions correctives "
        "doivent être validées par un responsable humain."
    )


if __name__ == "__main__":
    afficher_pilotage_grc()