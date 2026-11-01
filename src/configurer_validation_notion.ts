import "dotenv/config";
import { Client } from "@notionhq/client";

const token = process.env.NOTION_TOKEN;

if (!token) {
  console.error("❌ NOTION_TOKEN absent du fichier .env");
  process.exit(1);
}

const notion = new Client({ auth: token });

const dataSourceId = "40723e9d-728f-8052-858e-000b723b59e7";

async function configurerValidation() {
  console.log("🔧 Configuration de la validation humaine dans Notion...");

  // Vérifier que la base est accessible avant toute modification.
  const source = await notion.dataSources.retrieve({
    data_source_id: dataSourceId,
  });

  console.log("✅ Base Notion trouvée :", source.name);

  // Ajouter ou mettre à jour les propriétés de validation.
  await notion.dataSources.update({
    data_source_id: dataSourceId,
    properties: {
      "Statut de validation": {
        select: {
          options: [
            { name: "À vérifier", color: "yellow" },
            { name: "Validée", color: "green" },
            { name: "Rejetée", color: "red" },
          ],
        },
      },

      "Commentaire de validation": {
        rich_text: {},
      },

      "Date de validation": {
        date: {},
      },

      "Description corrigée": {
        rich_text: {},
      },
    },
  });

  console.log("✅ Statut de validation créé !");
  console.log("✅ Commentaire de validation créé !");
  console.log("✅ Date de validation créée !");
  console.log("✅ Description corrigée créée !");
  console.log("🎉 Configuration Notion terminée !");
}

configurerValidation().catch((erreur) => {
  console.error("❌ Erreur :", erreur);
  process.exitCode = 1;
});