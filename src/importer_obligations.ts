import "dotenv/config";
import { Client } from "@notionhq/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const dataSourceId = "40723e9d-728f-8052-858e-000b723b59e7";

// Lire les obligations générées par Qwen
const cheminJSON = join(
  process.cwd(),
  "src",
  "resultats",
  "obligations_rgpd.json"
);

type Obligation = {
  id: string;
  reference: string;
  description: string;
  mesures: string[];
  risques: string[];
};

const donnees = JSON.parse(
  readFileSync(cheminJSON, "utf-8")
) as {
  obligations: Obligation[];
};

async function importerObligations() {
  console.log("==================================");
  console.log("   IMPORTATION RGPD VERS NOTION");
  console.log("==================================");

  let importees = 0;

  for (const obligation of donnees.obligations) {
    try {
      console.log("\nTraitement :", obligation.id);

      // Rechercher si l'obligation existe déjà
      const recherche = await notion.dataSources.query({
        data_source_id: dataSourceId,
        filter: {
          property: "ID obligation",
          rich_text: {
            equals: obligation.id,
          },
        },
      });

      if (recherche.results.length > 0) {
        console.log("Déjà présente dans Notion : ignorée.");
        continue;
      }

      // Créer l'obligation dans Notion
      await notion.pages.create({
        parent: {
          type: "data_source_id",
          data_source_id: dataSourceId,
        },

        properties: {
          "Obligation": {
            type: "title",
            title: [
              {
                text: {
                  content: obligation.description.slice(0, 2000),
                },
              },
            ],
          },

          "ID obligation": {
            type: "rich_text",
            rich_text: [
              {
                text: {
                  content: obligation.id,
                },
              },
            ],
          },

          "Référence juridique": {
            type: "rich_text",
            rich_text: [
              {
                text: {
                  content: obligation.reference,
                },
              },
            ],
          },

          "Type à choisir dans Notion": {
            type: "rich_text",
            rich_text: [
              {
                text: {
                  content: obligation.mesures.join("; ").slice(0, 2000),
                },
              },
            ],
          },
        },
      });

      console.log("Obligation ajoutée !");
      importees++;

    } catch (erreur) {
      console.error("Erreur pour", obligation.id, ":", erreur);
    }
  }

  console.log("\n==================================");
  console.log("IMPORTATION TERMINÉE");
  console.log("Nouvelles obligations :", importees);
  console.log("==================================");
}

importerObligations();