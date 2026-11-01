# TP4 - Agent de Veille GRC et Législative

## Présentation
Projet réalisé dans le cadre de l'atelier EPITA 2026.

L'application permet d'analyser des documents réglementaires avec une IA locale, d'extraire des obligations et de générer des matrices GRC.

## Technologies
- Python et Streamlit
- TypeScript et Node.js
- Ollama et Qwen 2.5
- Notion API
- Pandas
- Flux RSS CNIL

## Fonctionnalités
- Importation de documents réglementaires TXT
- Extraction des obligations par IA
- Génération des matrices M1 à M5
- Synchronisation avec Notion
- Validation humaine des obligations
- Veille réglementaire CNIL
- Assistant IA GRC
- Tableau de bord de pilotage des risques

## Installation

Prérequis : Python, Node.js et Ollama.

Installer les dépendances Node.js :

    npm install

Installer les dépendances Python :

    pip install -r requirements.txt

Télécharger le modèle IA :

    ollama pull qwen2.5:3b

Configurer le fichier .env avec les identifiants Notion nécessaires.

## Exécution

    python -m streamlit run app.py

## Résultats
Les cinq matrices GRC sont disponibles dans src/resultats/.

## Limites
- Les analyses IA nécessitent une validation humaine.
- La veille automatique est principalement basée sur la CNIL.
- Les risques et échéances doivent être évalués lorsqu'ils ne sont pas renseignés.
- L'application nécessite Ollama en local.
