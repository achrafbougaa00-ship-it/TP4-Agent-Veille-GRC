import "dotenv/config";
import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

async function ajouterObligation() {
  try {
    console.log("Ajout d'une obligation RGPD dans Notion...");

    const dataSourceId = "40723e9d-728f-8052-858e-000b723b59e7";

    const resultat = await notion.pages.create({
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
                content: "Mettre en place des mesures de sécurité adaptées",
              },
            },
          ],
        },

        "ID obligation": {
          type: "rich_text",
          rich_text: [
            {
              text: {
                content: "RGPD-ART32-001",
              },
            },
          ],
        },

        "Référence juridique": {
          type: "rich_text",
          rich_text: [
            {
              text: {
                content: "RGPD - Article 32",
              },
            },
          ],
        },
      },
    });

    console.log("\nSUCCÈS !");
    console.log("Obligation ajoutée dans Notion !");
    console.log("ID :", resultat.id);

  } catch (erreur) {
    console.error("\nERREUR :", erreur);
  }
}

ajouterObligation();