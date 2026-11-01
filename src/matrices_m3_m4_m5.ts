import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// 1. Lire les obligations générées par notre IA

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

// 2. Fonction pour enregistrer un fichier CSV

function creerCSV(nomFichier: string, lignes: string[][]) {

  function echapperCSV(valeur: string): string {
    return `"${valeur.replace(/"/g, '""')}"`;
  }

  const contenu = lignes
    .map(ligne => ligne.map(echapperCSV).join(";"))
    .join("\r\n");

  const chemin = join(
    process.cwd(),
    "src",
    "resultats",
    nomFichier
  );

  writeFileSync(chemin, "\uFEFF" + contenu, "utf-8");

  console.log("Fichier créé :", nomFichier);
  console.log("Nombre de lignes :", lignes.length - 1);
}

// ====================================
// M3 : MATRICE DE COUVERTURE
// ====================================

const M3: string[][] = [
  [
    "ID obligation",
    "Reference juridique",
    "Obligation",
    "Mesure de securite",
    "Mesure implementee",
    "Preuve disponible",
    "Taux de couverture",
    "Validation humaine"
  ]
];

for (const obligation of donnees.obligations) {

  for (const mesure of obligation.mesures) {

    M3.push([
      obligation.id,
      obligation.reference,
      obligation.description,
      mesure,
      "A verifier",
      "A verifier",
      "Non calcule",
      "En attente"
    ]);

  }
}

// ====================================
// M4 : MATRICE DES RISQUES
// ====================================

const M4: string[][] = [
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
  ]
];

for (const obligation of donnees.obligations) {

  for (const risque of obligation.risques) {

    M4.push([
      obligation.id,
      obligation.reference,
      risque,
      "A evaluer",
      "A evaluer",
      "Non calculee",
      "A definir",
      "A designer",
      "En attente"
    ]);

  }
}

// ====================================
// M5 : MATRICE DE JURISPRUDENCE
// ====================================

const M5: string[][] = [
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
  ]
];

for (const obligation of donnees.obligations) {

  M5.push([
    obligation.id,
    obligation.reference,
    obligation.description,
    "A rechercher",
    "A rechercher",
    "A rechercher",
    "A rechercher",
    "A analyser",
    "En attente"
  ]);

}

// ====================================
// ENREGISTREMENT DES 3 MATRICES
// ====================================

console.log("=================================");
console.log("      GENERATION MATRICES GRC");
console.log("=================================\n");

creerCSV("M3_couverture.csv", M3);

console.log("");

creerCSV("M4_risques.csv", M4);

console.log("");

creerCSV("M5_jurisprudence.csv", M5);

console.log("\n=================================");
console.log("   GENERATION TERMINEE !");
console.log("=================================");