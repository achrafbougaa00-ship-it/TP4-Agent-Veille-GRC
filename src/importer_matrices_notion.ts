import "dotenv/config";
import { Client } from "@notionhq/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";

// ==========================================
// 1. CONFIGURATION NOTION
// ==========================================

if (!process.env.NOTION_TOKEN) {
  console.error("❌ NOTION_TOKEN est absent du fichier .env");
  process.exit(1);
}

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// ==========================================
// 2. CONFIGURATION DES 5 MATRICES
// ==========================================

const matrices = [
  {
    nom: "M1 — Traçabilité",
    fichier: "M1_tracabilite.csv",
    sourceId: "d53d3060-112e-43c6-8494-8bd2ae5d9bfc",
    titre: "ID",
  },
  {
    nom: "M2 — Impact",
    fichier: "M2_impact.csv",
    sourceId: "03aef078-bd62-4b5d-b4de-6ed8fa7f5623",
    titre: "ID obligation",
  },
  {
    nom: "M3 — Couverture",
    fichier: "M3_couverture.csv",
    sourceId: "843ef069-ebf7-4072-ae79-1ed819d5548b",
    titre: "ID obligation",
  },
  {
    nom: "M4 — Risques",
    fichier: "M4_risques.csv",
    sourceId: "a526bfcf-13bd-4888-a192-00c07cbc7268",
    titre: "ID obligation",
  },
  {
    nom: "M5 — Jurisprudence",
    fichier: "M5_jurisprudence.csv",
    sourceId: "c70f0fec-3cfd-41ea-a0a2-83d4ce7554af",
    titre: "ID obligation",
  },
];

// ==========================================
// 3. FONCTION DE LECTURE DES CSV
// ==========================================

function lireCSV(fichier: string): Record<string, string>[] {
  const chemin = join(
    process.cwd(),
    "src",
    "resultats",
    fichier
  );

  const contenu = readFileSync(chemin, "utf-8");

  return parse(contenu, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    bom: true,
  }) as Record<string, string>[];
}

// ==========================================
// 4. LIRE LES DONNÉES EXISTANTES DANS NOTION
// ==========================================

async function lireDonneesNotion(
  sourceId: string
): Promise<Record<string, string>[]> {

  const existantes: Record<string, string>[] = [];

  let cursor: string | undefined;

  do {
    const reponse = await notion.dataSources.query({
      data_source_id: sourceId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    for (const page of reponse.results) {

      if (!("properties" in page)) {
        continue;
      }

      const valeurs: Record<string, string> = {};

      for (const [nom, propriete] of Object.entries(
        page.properties
      )) {

        if (propriete.type === "title") {

          valeurs[nom] = propriete.title
            .map((element) => element.plain_text)
            .join("");

        } else if (propriete.type === "rich_text") {

          valeurs[nom] = propriete.rich_text
            .map((element) => element.plain_text)
            .join("");

        }
      }

      existantes.push(valeurs);
    }

    cursor = reponse.next_cursor ?? undefined;

  } while (cursor);

  return existantes;
}

// ==========================================
// 5. VÉRIFIER SI UNE LIGNE EXISTE DÉJÀ
// ==========================================

function estDoublon(
  ligne: Record<string, string>,
  existantes: Record<string, string>[]
): boolean {

  return existantes.some((existante) =>

    Object.entries(ligne).every(
      ([colonne, valeur]) =>
        (existante[colonne] ?? "") === (valeur ?? "")
    )

  );
}

// ==========================================
// 6. CRÉER UNE LIGNE DANS NOTION
// ==========================================

async function ajouterLigneNotion(
  sourceId: string,
  titre: string,
  ligne: Record<string, string>
) {

  const properties: Record<string, any> = {};

  for (const [colonne, valeur] of Object.entries(ligne)) {

    const texte = String(valeur ?? "").slice(0, 2000);

    if (colonne === titre) {

      properties[colonne] = {
        type: "title",
        title: [
          {
            text: {
              content: texte,
            },
          },
        ],
      };

    } else {

      properties[colonne] = {
        type: "rich_text",
        rich_text: [
          {
            text: {
              content: texte,
            },
          },
        ],
      };

    }
  }

  await notion.pages.create({
    parent: {
      type: "data_source_id",
      data_source_id: sourceId,
    },
    properties,
  });
}

// ==========================================
// 7. IMPORTER LES CINQ MATRICES
// ==========================================

async function importerMatrices() {

  console.log("==================================");
  console.log("    AGENT IA DE VEILLE GRC");
  console.log("==================================");

  console.log("\n☁️ SYNCHRONISATION AVEC NOTION\n");

  let totalAjoutees = 0;
  let totalIgnorees = 0;
  let totalErreurs = 0;

  for (const matrice of matrices) {

    console.log(`\n===== ${matrice.nom} =====`);

    try {

      // A. Lire les lignes du fichier CSV

      const lignes = lireCSV(matrice.fichier);

      console.log(
        `📄 Lignes CSV trouvées : ${lignes.length}`
      );

      // B. Lire les données déjà présentes dans Notion

      const existantes = await lireDonneesNotion(
        matrice.sourceId
      );

      console.log(
        `📚 Lignes existantes dans Notion : ${existantes.length}`
      );

      let ajoutees = 0;
      let ignorees = 0;

      // C. Parcourir les lignes CSV

      for (const ligne of lignes) {

        // Vérifier si la ligne existe déjà

        if (estDoublon(ligne, existantes)) {

          ignorees++;
          continue;
        }

        // D. Ajouter la nouvelle ligne dans Notion

        await ajouterLigneNotion(
          matrice.sourceId,
          matrice.titre,
          ligne
        );

        // Ajouter à la liste locale pour éviter
        // les doublons dans le même import

        existantes.push(ligne);

        ajoutees++;
      }

      totalAjoutees += ajoutees;
      totalIgnorees += ignorees;

      console.log(
        `✅ Lignes ajoutées : ${ajoutees}`
      );

      console.log(
        `⏭️ Doublons ignorés : ${ignorees}`
      );

    } catch (erreur) {

      totalErreurs++;

      console.error(
        `❌ Erreur pour ${matrice.nom} :`,
        erreur
      );

      // Signaler l'échec au programme appelant
      process.exitCode = 1;
    }
  }

  // ==========================================
  // 8. RÉSUMÉ DE LA SYNCHRONISATION
  // ==========================================

  console.log("\n==================================");
  console.log("     RÉSUMÉ SYNCHRONISATION");
  console.log("==================================");

  console.log(
    `📥 Total des lignes ajoutées : ${totalAjoutees}`
  );

  console.log(
    `⏭️ Total des doublons ignorés : ${totalIgnorees}`
  );

  console.log(
    `❌ Nombre de matrices en erreur : ${totalErreurs}`
  );

  if (totalErreurs === 0) {

    console.log(
      "\n🎉 Synchronisation Notion terminée avec succès !"
    );

  } else {

    console.error(
      "\n❌ Synchronisation partiellement échouée."
    );

    process.exitCode = 1;
  }
}

// ==========================================
// 9. LANCEMENT DU PROGRAMME
// ==========================================

importerMatrices().catch((erreur) => {

  console.error(
    "❌ Erreur générale de synchronisation :",
    erreur
  );

  process.exitCode = 1;
});