import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dossier = join(process.cwd(), "src", "resultats");

const cheminJSON = join(dossier, "obligations_rgpd.json");

type Obligation = {
  id: string;
  reference: string;
  description: string;
  mesures: string[];
  risques: string[];
};

type Analyse = {
  obligations: Obligation[];
};

const analyse: Analyse = JSON.parse(
  readFileSync(cheminJSON, "utf-8")
);

mkdirSync(dossier, { recursive: true });

// Éviter les erreurs lorsque les valeurs contiennent
// des points-virgules, des guillemets ou des retours à la ligne.
function cellule(valeur: unknown): string {
  const texte = String(valeur ?? "");
  return `"${texte.replace(/"/g, '""')}"`;
}

function creerCSV(
  nomFichier: string,
  colonnes: string[],
  lignes: unknown[][]
) {
  const contenu = [
    colonnes.map(cellule).join(";"),
    ...lignes.map((ligne) => ligne.map(cellule).join(";"))
  ].join("\r\n");

  const chemin = join(dossier, nomFichier);

  writeFileSync(chemin, "\uFEFF" + contenu, "utf-8");

  console.log(`✅ ${nomFichier} : ${lignes.length} lignes`);
}

// ==========================================
// M1 — TRAÇABILITÉ
// ==========================================

const m1: unknown[][] = [];

for (const obligation of analyse.obligations) {
  for (const mesure of obligation.mesures) {
    m1.push([
      obligation.id,
      obligation.reference,
      obligation.description,
      mesure,
      "À déterminer — validation humaine",
      "À évaluer"
    ]);
  }
}

creerCSV(
  "M1_tracabilite.csv",
  [
    "ID",
    "Reference juridique",
    "Obligation",
    "Mesure de securite",
    "Preuve attendue",
    "Statut"
  ],
  m1
);

// ==========================================
// M2 — IMPACT
// ==========================================

const m2: unknown[][] = [];

for (const obligation of analyse.obligations) {
  for (const risque of obligation.risques) {
    m2.push([
      obligation.id,
      obligation.reference,
      obligation.description,
      risque,
      "À évaluer selon le contexte",
      "Non évalué",
      "Analyse d'impact à réaliser",
      "À valider"
    ]);
  }
}

creerCSV(
  "M2_impact.csv",
  [
    "ID obligation",
    "Reference juridique",
    "Obligation",
    "Risque identifie",
    "Impact potentiel",
    "Niveau d'impact",
    "Justification",
    "Validation humaine"
  ],
  m2
);

// ==========================================
// M3 — COUVERTURE
// ==========================================

const m3: unknown[][] = [];

for (const obligation of analyse.obligations) {
  for (const mesure of obligation.mesures) {
    m3.push([
      obligation.id,
      obligation.reference,
      obligation.description,
      mesure,
      "À renseigner",
      "À vérifier",
      "Non évalué",
      "À valider"
    ]);
  }
}

creerCSV(
  "M3_couverture.csv",
  [
    "ID obligation",
    "Reference juridique",
    "Obligation",
    "Mesure de securite",
    "Mesure implementee",
    "Preuve disponible",
    "Taux de couverture",
    "Validation humaine"
  ],
  m3
);

// ==========================================
// M4 — RISQUES
// ==========================================

const m4: unknown[][] = [];

for (const obligation of analyse.obligations) {
  for (const risque of obligation.risques) {
    m4.push([
      obligation.id,
      obligation.reference,
      risque,
      "Non évaluée",
      "Non évaluée",
      "Non évaluée",
      "À définir",
      "À désigner",
      "À analyser"
    ]);
  }
}

creerCSV(
  "M4_risques.csv",
  [
    "ID obligation",
    "Reference juridique",
    "Risque",
    "Probabilite",
    "Gravite",
    "Criticite",
    "Action corrective",
    "Responsable",
    "Statut"
  ],
  m4
);

// ==========================================
// M5 — JURISPRUDENCE
// ==========================================

// Le JSON ne contient aucune décision de justice.
// Nous n'inventons donc aucune jurisprudence.
// Cette matrice reste vide jusqu'à l'ajout
// de décisions vérifiées et sourcées.

creerCSV(
  "M5_jurisprudence.csv",
  [
    "ID obligation",
    "Reference juridique",
    "Obligation",
    "Autorite ou juridiction",
    "Decision",
    "Date de decision",
    "Source officielle",
    "Lien avec obligation",
    "Validation humaine"
  ],
  []
);

console.log("\n🎉 Les 5 matrices GRC ont été générées !");
console.log("⚠️ Les évaluations et les preuves nécessitent une validation humaine.");