import "dotenv/config";
import * as cheerio from "cheerio";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

const DOSSIER_RESULTATS = join(process.cwd(), "src", "resultats");

const FICHIER_HISTORIQUE = join(
  DOSSIER_RESULTATS,
  "historique_publications_cnil.json"
);

const FICHIER_RESULTATS = join(
  DOSSIER_RESULTATS,
  "veille_reglementaire.json"
);

const URL_RSS = "https://www.cnil.fr/fr/rss.xml";

type Statut = "NOUVEAU" | "MODIFIE" | "INCHANGE";

type Publication = {
  id: string;
  organisme: string;
  titre: string;
  url: string;
  description: string;
  date_publication: string;
  date_collecte: string;
  statut: Statut;
  empreinte: string;
};

type Historique = Record<
  string,
  {
    empreinte: string;
    derniere_collecte: string;
  }
>;

function calculerEmpreinte(texte: string): string {
  return createHash("sha256")
    .update(texte, "utf8")
    .digest("hex");
}

async function chargerHistorique(): Promise<Historique> {
  try {
    const contenu = await readFile(FICHIER_HISTORIQUE, "utf8");
    return JSON.parse(contenu) as Historique;
  } catch (erreur: any) {
    if (erreur.code === "ENOENT") {
      return {};
    }

    throw erreur;
  }
}

async function main() {
  console.log("==================================");
  console.log("🛡️ AGENT DE VEILLE RÉGLEMENTAIRE");
  console.log("==================================");

  await mkdir(DOSSIER_RESULTATS, { recursive: true });

  const historique = await chargerHistorique();

  console.log("\n🔎 Consultation du flux RSS CNIL...");

  const reponse = await fetch(URL_RSS, {
    headers: {
      "User-Agent": "TP4-GRC-AgentVeille/1.0",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!reponse.ok) {
    throw new Error(`Erreur HTTP ${reponse.status}`);
  }

  const xml = await reponse.text();

  const $ = cheerio.load(xml, {
    xmlMode: true,
  });

  const publications: Publication[] = [];

  $("item").each((_, element) => {
    const item = $(element);

    const titre = item.find("title").first().text().trim();
    const url = item.find("link").first().text().trim();
    const description = item.find("description").first().text().trim();

    const guid = item.find("guid").first().text().trim();
    const datePublication = item.find("pubDate").first().text().trim();

    if (!titre || !url) {
      return;
    }

    const id = guid || url;

    const contenu = JSON.stringify({
      titre,
      url,
      description,
      datePublication,
    });

    const empreinte = calculerEmpreinte(contenu);

    const ancienneVersion = historique[id];

    let statut: Statut;

    if (!ancienneVersion) {
      statut = "NOUVEAU";
    } else if (ancienneVersion.empreinte !== empreinte) {
      statut = "MODIFIE";
    } else {
      statut = "INCHANGE";
    }

    const dateCollecte = new Date().toISOString();

    publications.push({
      id,
      organisme: "CNIL",
      titre,
      url,
      description,
      date_publication: datePublication,
      date_collecte: dateCollecte,
      statut,
      empreinte,
    });

    historique[id] = {
      empreinte,
      derniere_collecte: dateCollecte,
    };
  });

  if (publications.length === 0) {
    throw new Error("Aucune publication trouvée dans le flux RSS.");
  }

  const resultat = {
    date_execution: new Date().toISOString(),
    source: "CNIL",
    url_source: URL_RSS,
    nombre_publications: publications.length,
    nouvelles: publications.filter((p) => p.statut === "NOUVEAU").length,
    modifiees: publications.filter((p) => p.statut === "MODIFIE").length,
    inchangees: publications.filter((p) => p.statut === "INCHANGE").length,
    publications,
  };

  await writeFile(
    FICHIER_HISTORIQUE,
    JSON.stringify(historique, null, 2),
    "utf8"
  );

  await writeFile(
    FICHIER_RESULTATS,
    JSON.stringify(resultat, null, 2),
    "utf8"
  );

  console.log("\n==================================");
  console.log("📊 RÉSULTATS DE LA VEILLE");
  console.log("==================================");

  console.log(`📄 Publications : ${resultat.nombre_publications}`);
  console.log(`🆕 Nouvelles : ${resultat.nouvelles}`);
  console.log(`🔄 Modifiées : ${resultat.modifiees}`);
  console.log(`✅ Inchangées : ${resultat.inchangees}`);

  console.log("\n📰 Publications détectées :");

  for (const publication of publications) {
    console.log(`\n[${publication.statut}] ${publication.titre}`);
    console.log(`🔗 ${publication.url}`);
  }

  console.log(`\n💾 Résultats : ${FICHIER_RESULTATS}`);
  console.log("\n✅ Veille terminée !");
}

main().catch((erreur) => {
  console.error("❌ Erreur :", erreur);
  process.exitCode = 1;
});