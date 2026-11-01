import "dotenv/config";
import { Client } from "@notionhq/client";
import { readFileSync } from "node:fs";

const token = process.env.NOTION_TOKEN;

if (!token) {
  console.error("❌ NOTION_TOKEN absent du fichier .env");
  process.exit(1);
}

const notion = new Client({ auth: token });

const DATA_SOURCE_ID = "40723e9d-728f-8052-858e-000b723b59e7";

type Decision = "À vérifier" | "Validée" | "Rejetée";

type Validation = {
  page_id: string;
  statut: Decision;
  description_corrigee?: string;
  commentaire?: string;
};

function lireTexte(propriete: any): string {
  if (!propriete) return "";

  if (propriete.type === "title") {
    return propriete.title
      .map((element: any) => element.plain_text)
      .join("");
  }

  if (propriete.type === "rich_text") {
    return propriete.rich_text
      .map((element: any) => element.plain_text)
      .join("");
  }

  return "";
}

function texteNotion(valeur: string) {
  return [
    {
      text: {
        content: valeur.slice(0, 2000),
      },
    },
  ];
}

// ==========================================
// 1. LISTER LES OBLIGATIONS
// ==========================================

async function listerObligations() {
  const obligations: any[] = [];
  let cursor: string | undefined;

  do {
    const resultat = await notion.dataSources.query({
      data_source_id: DATA_SOURCE_ID,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    for (const page of resultat.results) {
      if (!("properties" in page)) continue;

      const proprietes = page.properties;

      const statut = proprietes["Statut de validation"];

      obligations.push({
        page_id: page.id,
        id_obligation: lireTexte(proprietes["ID obligation"]),
        reference: lireTexte(proprietes["Référence juridique"]),
        description: lireTexte(proprietes["Obligation"]),
        description_corrigee: lireTexte(
          proprietes["Description corrigée"]
        ),
        commentaire: lireTexte(
          proprietes["Commentaire de validation"]
        ),
        statut:
          statut?.type === "select"
            ? statut.select?.name ?? "À vérifier"
            : "À vérifier",
      });
    }

    cursor = resultat.next_cursor ?? undefined;
  } while (cursor);

  // Sortie JSON utilisable directement par Streamlit
  console.log(JSON.stringify({ obligations }));
}

// ==========================================
// 2. ENREGISTRER UNE VALIDATION
// ==========================================

async function enregistrerValidation(
  fichier: string
) {
  const validation = JSON.parse(
    readFileSync(fichier, "utf-8")
  ) as Validation;

  if (
    !validation.page_id ||
    !["À vérifier", "Validée", "Rejetée"].includes(
      validation.statut
    )
  ) {
    throw new Error("Données de validation invalides.");
  }

  // Vérifier que la page appartient à notre base Notion
  const pages = await notion.dataSources.query({
    data_source_id: DATA_SOURCE_ID,
    page_size: 100,
  });

  const pageTrouvee = pages.results.some(
    (page) => page.id === validation.page_id
  );

  if (!pageTrouvee) {
    throw new Error(
      "Obligation introuvable dans les 100 premières lignes de Notion."
    );
  }

  await notion.pages.update({
    page_id: validation.page_id,
    properties: {
      "Statut de validation": {
        select: {
          name: validation.statut,
        },
      },

      "Description corrigée": {
        rich_text: texteNotion(
          validation.description_corrigee ?? ""
        ),
      },

      "Commentaire de validation": {
        rich_text: texteNotion(
          validation.commentaire ?? ""
        ),
      },

      "Date de validation": {
        date: {
          start: new Date().toISOString(),
        },
      },
    },
  });

  console.log(
    JSON.stringify({
      succes: true,
      message: "Validation enregistrée dans Notion",
      page_id: validation.page_id,
      statut: validation.statut,
    })
  );
}

// ==========================================
// 3. EXÉCUTION
// ==========================================

async function main() {
  const action = process.argv[2];

  if (action === "lister") {
    await listerObligations();
  } else if (action === "valider") {
    const fichier = process.argv[3];

    if (!fichier) {
      throw new Error(
        "Fichier JSON de validation manquant."
      );
    }

    await enregistrerValidation(fichier);
  } else {
    throw new Error(
      "Action inconnue. Utilisez lister ou valider."
    );
  }
}

main().catch((erreur) => {
  console.error("❌ Erreur Notion :", erreur);
  process.exitCode = 1;
});