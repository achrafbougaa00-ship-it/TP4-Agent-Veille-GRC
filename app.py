import streamlit as st
import pandas as pd
import subprocess
import json
from pathlib import Path
from fil_veille import afficher_fil_veille
from chatbot_grc import afficher_chatbot_grc
from pilotage_grc import afficher_pilotage_grc

# ==========================================
# 1. CONFIGURATION
# ==========================================

st.set_page_config(
    page_title="Agent de Veille GRC",
    page_icon="🛡️",
    layout="wide"
)

BASE = Path(__file__).resolve().parent
DOSSIER = BASE / "src" / "resultats"
DOSSIER_DOCUMENTS = BASE / "src" / "documents"

DOSSIER.mkdir(parents=True, exist_ok=True)
DOSSIER_DOCUMENTS.mkdir(parents=True, exist_ok=True)

FICHIERS_MATRICES = {
    "M1 — Traçabilité": "M1_tracabilite.csv",
    "M2 — Impact": "M2_impact.csv",
    "M3 — Couverture": "M3_couverture.csv",
    "M4 — Risques": "M4_risques.csv",
    "M5 — Jurisprudence": "M5_jurisprudence.csv"
}

st.title("🛡️ Agent de Veille GRC et Législative")
st.write("Analyse réglementaire assistée par intelligence artificielle")
st.divider()


# ==========================================
# 2. FONCTION POUR LANCER TYPESCRIPT
# ==========================================

def lancer_typescript(fichier, argument=None, timeout=600):

    commande = [
        "npx.cmd",
        "tsx",
        fichier
    ]
    

    if argument is not None:
        commande.append(str(argument))

    execution = subprocess.run(
        commande,
        cwd=str(BASE),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout
    )
    

    if execution.returncode != 0:
        raise RuntimeError(
            execution.stderr or execution.stdout
        )
    

    return execution.stdout


# ==========================================
# 3. MENU DE NAVIGATION
# ==========================================

menu = st.sidebar.radio(
    "Navigation",
    [
        "🏠 Accueil",
        "🤖 Analyse IA",
        "📊 Matrices GRC",
        "👤 Validation humaine",
        "📰 Fil de veille",
        "💬 Assistant IA GRC",
        "📈 Pilotage et échéances",
        "ℹ️ À propos",
    ]
)


# ==========================================
# 4. PAGE ACCUEIL
# ==========================================

if menu == "🏠 Accueil":

    st.header("Bienvenue dans votre agent GRC")

    st.success("Application opérationnelle !")

    st.write("""
    Cette application permet de :

    - Importer un document réglementaire TXT.
    - Analyser son contenu avec Qwen 2.5.
    - Identifier les obligations réglementaires.
    - Générer un fichier JSON structuré.
    - Générer automatiquement les cinq matrices GRC.
    - Consulter et télécharger les matrices.
    """)

    st.subheader("🔄 Fonctionnement de l'agent")

    st.code("""
Document réglementaire TXT
          |
          v
    Application Streamlit
          |
          v
    Agent TypeScript
          |
          v
    IA locale Qwen 2.5
          |
          v
    Obligations JSON
          |
          v
    Génération des matrices
          |
          v
    M1 - Traçabilité
    M2 - Impact
    M3 - Couverture
    M4 - Risques
    M5 - Jurisprudence
    """)

    st.info(
        "La synchronisation avec Notion se lance manuellement "
        "après vérification des matrices."
    )


# ==========================================
# 5. PAGE ANALYSE IA
# ==========================================

elif menu == "🤖 Analyse IA":

    st.header("🤖 Analyse réglementaire avec Qwen")

    st.write(
        "Importez un document réglementaire TXT "
        "pour identifier ses obligations et générer "
        "automatiquement les cinq matrices GRC."
    )

    document = st.file_uploader(
        "📄 Importer un document réglementaire",
        type=["txt"]
    )

    if document is not None:

        try:
            contenu = document.getvalue().decode("utf-8-sig")

        except UnicodeDecodeError:
            st.error(
                "Impossible de lire le document. "
                "Utilisez un fichier TXT encodé en UTF-8."
            )
            st.stop()

        st.success(f"📄 Document chargé : {document.name}")

        st.text_area(
            "Contenu du document",
            contenu,
            height=250
        )

        if st.button(
            "🚀 Analyser avec l'IA",
            type="primary"
        ):

            # Effacer l'ancien résultat affiché
            st.session_state.pop("obligations_json", None)
            st.session_state.pop("document_analyse", None)
            st.session_state.pop("matrices_generees", None)

            if not contenu.strip():

                st.warning("Le document est vide.")

            else:

                with st.spinner(
                    "🤖 Analyse en cours avec Qwen... "
                    "Cela peut prendre quelques minutes."
                ):

                    try:

                        # ----------------------------------
                        # A. Enregistrer le document
                        # ----------------------------------

                        chemin_document = (
                            DOSSIER_DOCUMENTS /
                            "document_streamlit.txt"
                        )

                        chemin_document.write_text(
                            contenu,
                            encoding="utf-8"
                        )

                        # ----------------------------------
                        # B. Préparer le fichier JSON
                        # ----------------------------------

                        chemin_json = (
                            DOSSIER /
                            "obligations_rgpd.json"
                        )

                        # Supprimer l'ancien JSON pour éviter
                        # d'afficher un résultat périmé
                        if chemin_json.exists():
                            chemin_json.unlink()

                        # ----------------------------------
                        # C. Lancer l'analyse Qwen
                        # ----------------------------------

                        sortie_analyse = lancer_typescript(
                            "src/index.ts",
                            argument=chemin_document,
                            timeout=600
                        )

                        # Vérifier que Qwen a réussi
                        if (
                            "Analyse JSON validée avec succès !"
                            not in sortie_analyse
                        ):
                            raise RuntimeError(
                                "L'analyse JSON n'a pas été validée.\n\n"
                                + sortie_analyse
                            )

                        if not chemin_json.exists():
                            raise FileNotFoundError(
                                "Le fichier JSON n'a pas été généré."
                            )

                        # ----------------------------------
                        # D. Lire les obligations JSON
                        # ----------------------------------

                        donnees = json.loads(
                            chemin_json.read_text(
                                encoding="utf-8"
                            )
                        )

                        if (
                            not isinstance(donnees, dict)
                            or not isinstance(
                                donnees.get("obligations"),
                                list
                            )
                        ):
                            raise ValueError(
                                "Le JSON généré est invalide."
                            )

                        # ----------------------------------
                        # E. Générer les 5 matrices GRC
                        # ----------------------------------

                        sortie_matrices = lancer_typescript(
                            "src/generer_matrices.ts",
                            timeout=120
                        )

                        # Vérifier les fichiers générés
                        fichiers_manquants = []

                        for nom in FICHIERS_MATRICES.values():

                            chemin = DOSSIER / nom

                            if not chemin.exists():
                                fichiers_manquants.append(nom)

                        if fichiers_manquants:
                            raise RuntimeError(
                                "Matrices manquantes : "
                                + ", ".join(fichiers_manquants)
                            )

                        # ----------------------------------
                        # F. Enregistrer les résultats
                        # ----------------------------------

                        st.session_state[
                            "obligations_json"
                        ] = donnees

                        st.session_state[
                            "document_analyse"
                        ] = document.name

                        st.session_state[
                            "matrices_generees"
                        ] = True

                        st.success(
                            "✅ Analyse IA terminée ! "
                            "JSON généré avec succès."
                        )

                        st.success(
                            "✅ Les 5 matrices GRC "
                            "ont été générées automatiquement !"
                        )

                        with st.expander(
                            "🖥️ Détails techniques de l'exécution"
                        ):

                            st.code(sortie_analyse)
                            st.code(sortie_matrices)

                    except subprocess.TimeoutExpired:

                        st.error(
                            "⏱️ L'exécution a dépassé "
                            "le délai autorisé."
                        )

                    except FileNotFoundError as erreur:

                        st.error(
                            f"❌ Fichier ou programme introuvable : {erreur}"
                        )

                    except Exception as erreur:

                        st.error(
                            f"❌ Erreur pendant l'analyse : {erreur}"
                        )

    # ==========================================
    # 6. AFFICHAGE DES OBLIGATIONS
    # ==========================================

    if "obligations_json" in st.session_state:

        donnees = st.session_state["obligations_json"]

        st.divider()

        st.subheader("📋 Résultat de l'analyse")

        st.info(
            "Document analysé : "
            + st.session_state.get(
                "document_analyse",
                "Document inconnu"
            )
        )

        obligations = donnees.get("obligations", [])

        st.metric(
            "📊 Nombre d'obligations identifiées",
            len(obligations)
        )

        if obligations:

            for obligation in obligations:

                identifiant = obligation.get(
                    "id",
                    "Sans identifiant"
                )

                reference = obligation.get(
                    "reference",
                    "Référence inconnue"
                )

                with st.expander(
                    f"📌 {identifiant} — {reference}",
                    expanded=True
                ):

                    st.markdown("**Description :**")

                    st.write(
                        obligation.get(
                            "description",
                            "Non renseignée"
                        )
                    )

                    st.markdown(
                        "**🔐 Mesures de sécurité :**"
                    )

                    for mesure in obligation.get(
                        "mesures",
                        []
                    ):
                        st.write("•", mesure)

                    st.markdown(
                        "**⚠️ Risques de non-conformité :**"
                    )

                    for risque in obligation.get(
                        "risques",
                        []
                    ):
                        st.write("•", risque)

        else:

            st.warning(
                "Aucune obligation réglementaire identifiée."
            )

        # ----------------------------------
        # Télécharger le JSON
        # ----------------------------------

        st.subheader("🧾 Données JSON")

        st.json(donnees)

        st.download_button(
            "⬇️ Télécharger les obligations JSON",
            data=json.dumps(
                donnees,
                ensure_ascii=False,
                indent=2
            ),
            file_name="obligations_grc.json",
            mime="application/json"
        )

        # ----------------------------------
        # Résumé des matrices générées
        # ----------------------------------

        if st.session_state.get("matrices_generees"):

            st.divider()

            st.subheader("📊 Matrices GRC générées")

            resume = []

            for nom, fichier in FICHIERS_MATRICES.items():

                chemin = DOSSIER / fichier

                if chemin.exists():

                    df = pd.read_csv(
                        chemin,
                        sep=";",
                        encoding="utf-8-sig"
                    )

                    resume.append({
                        "Matrice": nom,
                        "Nombre de lignes": len(df),
                        "Statut": "Générée"
                    })

            st.dataframe(
                pd.DataFrame(resume),
                use_container_width=True,
                hide_index=True
            )

            st.info(
                "Pour consulter les tableaux détaillés, "
                "cliquez sur « 📊 Matrices GRC » "
                "dans le menu de gauche."
            )

        # ----------------------------------
        # Synchronisation Notion avec confirmation
        # ----------------------------------

        if st.session_state.get("matrices_generees"):
            st.divider()
            st.subheader("☁️ Synchronisation avec Notion")
            st.warning(
                "Cette action ajoute les lignes absentes dans vos bases Notion. "
                "Une reformulation peut être considérée comme une nouvelle ligne. "
                "Vérifiez les cinq matrices avant de continuer."
            )

            confirmation = st.checkbox(
                "J'ai vérifié les obligations et les matrices et "
                "j'autorise leur envoi vers Notion.",
                key="confirmation_notion"
            )

            if st.button(
                "☁️ Synchroniser les matrices avec Notion",
                disabled=not confirmation,
                type="primary"
            ):
                with st.spinner("Synchronisation avec Notion en cours..."):
                    try:
                        sortie_notion = lancer_typescript(
                            "src/importer_matrices_notion.ts",
                            timeout=600
                        )
                        if "Synchronisation Notion terminée avec succès !" not in sortie_notion:
                            raise RuntimeError(
                                "La synchronisation n'a pas été confirmée :\n"
                                + sortie_notion
                            )
                        st.success("✅ Synchronisation Notion terminée !")
                        st.code(sortie_notion)
                    except subprocess.TimeoutExpired:
                        st.error(
                            "La synchronisation a dépassé 10 minutes. "
                            "Vérifiez Notion avant de réessayer."
                        )
                    except Exception as erreur:
                        st.error(f"❌ Synchronisation non confirmée : {erreur}")
                        st.info(
                            "Certaines lignes ont peut-être été ajoutées. "
                            "Vérifiez Notion avant de relancer."
                        )

        st.warning(
            "⚖️ Les résultats sont générés par une IA. "
            "Les références juridiques, les obligations, "
            "les risques et les mesures doivent être "
            "vérifiés par un humain avant utilisation."
        )


# ==========================================
# 7. PAGE MATRICES GRC
# ==========================================

elif menu == "📊 Matrices GRC":

    st.header("📊 Matrices GRC")

    st.write(
        "Consultez les cinq matrices GRC "
        "générées à partir de la dernière analyse."
    )

    choix = st.selectbox(
        "Choisir une matrice",
        list(FICHIERS_MATRICES.keys())
    )

    chemin = DOSSIER / FICHIERS_MATRICES[choix]

    if chemin.exists():

        try:

            df = pd.read_csv(
                chemin,
                sep=";",
                encoding="utf-8-sig"
            )

            st.success(
                f"✅ {len(df)} lignes trouvées"
            )

            st.dataframe(
                df,
                use_container_width=True
            )

            st.download_button(
                "⬇️ Télécharger la matrice CSV",
                data=chemin.read_bytes(),
                file_name=FICHIERS_MATRICES[choix],
                mime="text/csv"
            )

        except Exception as erreur:

            st.error(
                f"Erreur de lecture de la matrice : {erreur}"
            )

    else:

        st.error(
            "❌ Fichier introuvable : "
            + str(chemin)
        )


# ==========================================
# 8. PAGE FIL DE VEILLE
# ==========================================

elif menu == "📰 Fil de veille":

    afficher_fil_veille()

elif menu == "💬 Assistant IA GRC":

    afficher_chatbot_grc()
elif menu == "📈 Pilotage et échéances":
    afficher_pilotage_grc()


# ==========================================
# 9. PAGE VALIDATION HUMAINE
# ==========================================

elif menu == "👤 Validation humaine":

    st.header("👤 Validation humaine des obligations")
    st.write(
        "Consultez les obligations présentes dans Notion, corrigez-les "
        "si nécessaire, puis enregistrez votre décision."
    )
    st.info("La description originale reste conservée dans Notion pour assurer la traçabilité.")

    def charger_obligations_notion():
        sortie = lancer_typescript(
            "src/validation_notion.ts", argument="lister", timeout=90
        )
        donnees_notion = json.loads(sortie.strip())
        return [
            obligation for obligation in donnees_notion.get("obligations", [])
            if obligation.get("id_obligation", "").strip()
            and obligation.get("description", "").strip()
        ]

    if st.button("🔄 Actualiser depuis Notion"):
        st.session_state.pop("validation_obligations", None)
        st.session_state.pop("validation_selection", None)

    if "validation_obligations" not in st.session_state:
        try:
            with st.spinner("Lecture des obligations depuis Notion..."):
                st.session_state["validation_obligations"] = charger_obligations_notion()
        except (ValueError, RuntimeError, subprocess.TimeoutExpired) as erreur:
            st.error(f"Impossible de lire les obligations Notion : {erreur}")
            st.stop()

    obligations_notion = st.session_state["validation_obligations"]
    if not obligations_notion:
        st.warning("Aucune obligation exploitable trouvée dans Notion.")
    else:
        st.success(f"{len(obligations_notion)} obligation(s) trouvée(s) dans Notion.")
        statuts = ["À vérifier", "Validée", "Rejetée"]
        lignes = [
            {
                "ID": o.get("id_obligation", ""),
                "Référence": o.get("reference", ""),
                "Statut": o.get("statut", "À vérifier"),
            }
            for o in obligations_notion
        ]
        st.dataframe(pd.DataFrame(lignes), hide_index=True, use_container_width=True)

        choix_id = st.selectbox(
            "Sélectionner une obligation",
            options=[o["page_id"] for o in obligations_notion],
            format_func=lambda page_id: next(
                (
                    f"{o['id_obligation']} — {o['reference']}"
                    for o in obligations_notion if o["page_id"] == page_id
                ), page_id
            ),
            key="validation_selection",
        )
        obligation = next(o for o in obligations_notion if o["page_id"] == choix_id)
        st.markdown("**Description originale (non modifiable) :**")
        st.write(obligation["description"])
        st.caption(f"Référence juridique : {obligation.get('reference') or 'Non renseignée'}")

        statut_actuel = obligation.get("statut", "À vérifier")
        with st.form(key=f"form_validation_{choix_id}"):
            statut_choisi = st.selectbox(
                "Décision humaine",
                statuts,
                index=statuts.index(statut_actuel) if statut_actuel in statuts else 0,
            )
            correction = st.text_area(
                "Description corrigée (facultatif)",
                value=obligation.get("description_corrigee", ""),
                help="Laissez vide si la description originale est correcte.",
                max_chars=2000,
            )
            commentaire = st.text_area(
                "Commentaire de validation (facultatif)",
                value=obligation.get("commentaire", ""),
                max_chars=2000,
            )
            confirmer = st.checkbox(
                "Je confirme avoir vérifié cette obligation et souhaite enregistrer ma décision."
            )
            enregistrer = st.form_submit_button(
                "💾 Enregistrer dans Notion", type="primary"
            )

        if enregistrer:
            if not confirmer:
                st.warning("Confirmez la vérification avant d'enregistrer.")
            else:
                # Le script TypeScript existant attend un fichier JSON en argument.
                # Fichier temporaire créé hors du projet, puis supprimé.
                import tempfile
                import os

                donnees_validation = {
                    "page_id": choix_id,
                    "statut": statut_choisi,
                    "description_corrigee": correction,
                    "commentaire": commentaire,
                }
                chemin_temporaire = None
                try:
                    with tempfile.NamedTemporaryFile(
                        mode="w", encoding="utf-8", suffix=".json",
                        delete=False
                    ) as fichier_temporaire:
                        json.dump(donnees_validation, fichier_temporaire, ensure_ascii=False)
                        chemin_temporaire = fichier_temporaire.name

                    with st.spinner("Enregistrement de la décision dans Notion..."):
                        commande = [
                            "npx.cmd", "tsx", "src/validation_notion.ts",
                            "valider", chemin_temporaire
                        ]
                        resultat = subprocess.run(
                            commande, cwd=str(BASE), capture_output=True,
                            text=True, encoding="utf-8", errors="replace", timeout=90
                        )
                        if resultat.returncode != 0:
                            raise RuntimeError(resultat.stderr or resultat.stdout)
                        confirmation_notion = json.loads(resultat.stdout.strip())
                        if not confirmation_notion.get("succes"):
                            raise RuntimeError("Notion n'a pas confirmé l'enregistrement.")

                    st.session_state.pop("validation_obligations", None)
                    st.success("✅ Décision enregistrée dans Notion !")
                    st.info("Cliquez sur « 🔄 Actualiser depuis Notion » pour vérifier le statut.")
                except (RuntimeError, ValueError, subprocess.TimeoutExpired) as erreur:
                    st.error(f"❌ Enregistrement non confirmé : {erreur}")
                finally:
                    if chemin_temporaire and os.path.exists(chemin_temporaire):
                        os.unlink(chemin_temporaire)


# ==========================================
# 10. PAGE À PROPOS
# ==========================================

elif menu == "ℹ️ À propos":

    st.header("ℹ️ À propos du projet")

    st.write("""
    ### TP4 — Agent de Veille GRC et Législative

    **Technologies utilisées :**

    - Python
    - Streamlit
    - TypeScript
    - Ollama
    - Qwen 2.5 7B
    - Zod
    - Notion API

    ### Fonctionnement actuel

    1. L'utilisateur importe un document réglementaire TXT.
    2. Streamlit enregistre le document.
    3. TypeScript lance l'analyse avec Qwen.
    4. Zod valide les données générées.
    5. L'agent enregistre les obligations au format JSON.
    6. Le programme génère les cinq matrices CSV.
    7. Streamlit affiche les obligations et les matrices.

    ### Évolutions prévues

    - Importation directe des documents PDF et Word.
    - Synchronisation Notion sur confirmation humaine.
    - Historique des analyses réglementaires.
    - Validation humaine des obligations.
    """)
