import "dotenv/config";
import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Page Notion "TP4 — Matrices GRC"
const pageId = "40723e9d728f8014b39dedeea9a5c52b";

// Colonnes des 5 matrices
const matrices = [
  {
    nom: "M1 — Traçabilité",
    colonnes: [
      "ID",
      "Reference juridique",
      "Obligation",
      "Mesure de securite",
      "Preuve attendue",
      "Statut",
    ],
  },
  {
    nom: "M2 — Impact",
    colonnes: [
      "ID obligation",
      "Reference juridique",
      "Obligation",
      "Risque identifie",
      "Impact potentiel",
      "Niveau d'impact",
      "Justification",
      "Validation humaine",
    ],
  },
  {
    nom: "M3 — Couverture",
    colonnes: [
      "ID obligation",
      "Reference juridique",
      "Obligation",
      "Mesure de securite",
      "Mesure implementee",
      "Preuve disponible",
      "Taux de couverture",
      "Validation humaine",
    ],
  },
  {
    nom: "M4 — Risques",
    colonnes: [
      "ID obligation",
      "Reference juridique",
      "Risque",
      "Probabilite",
      "Gravite",
      "Criticite",
      "Action corrective",
      "Responsable",
      "Statut",
    ],
  },
  {
    nom: "M5 — Jurisprudence",
    colonnes: [
      "ID obligation",
      "Reference juridique",
      "Obligation",
      "Autorite ou juridiction",
      "Decision",
      "Date de decision",
      "Source officielle",
      "Lien avec obligation",
      "Validation humaine",
    ],
  },
];

async function creerMatrices() {
  console.log("Création des 5 matrices GRC dans Notion...");

  for (const matrice of matrices) {
    try {
      console.log(`\nCréation : ${matrice.nom}`);

      // Première colonne : titre obligatoire dans Notion
      const premiereColonne = matrice.colonnes[0];

      const properties: Record<string, any> = {
        [premiereColonne]: {
          title: {},
        },
      };

      // Autres colonnes : texte
      for (const colonne of matrice.colonnes.slice(1)) {
        properties[colonne] = {
          rich_text: {},
        };
      }

      const resultat = await notion.databases.create({
        parent: {
          type: "page_id",
          page_id: pageId,
        },
        title: [
          {
            type: "text",
            text: {
              content: matrice.nom,
            },
          },
        ],
        initial_data_source: {
          properties,
        },
      });

      console.log(`SUCCÈS : ${matrice.nom}`);
      console.log(`ID : ${resultat.id}`);

    } catch (erreur) {
      console.error(`ERREUR pour ${matrice.nom} :`, erreur);
    }
  }

  console.log("\nCréation terminée !");
}

creerMatrices();