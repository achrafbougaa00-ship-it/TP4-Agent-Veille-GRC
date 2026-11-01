import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// 1. Charger les obligations extraites par Qwen
const cheminJSON = join(
  process.cwd(),
  "src",
  "resultats",
  "obligations_rgpd.json"
);

const donnees = JSON.parse(
  readFileSync(cheminJSON, "utf-8")
) as {
  obligations: {
    id: string;
    reference: string;
    description: string;
    mesures: string[];
    risques: string[];
  }[];
};

// 2. Préparer les colonnes de la matrice M2
const lignes: string[][] = [
  [
    "ID obligation",
    "Reference juridique",
    "Obligation",
    "Risque identifie",
    "Impact potentiel",
    "Niveau d'impact",
    "Justification",
    "Validation humaine"
  ]
];

// 3. Construire les lignes de la matrice
for (const obligation of donnees.obligations) {
  for (const risque of obligation.risques) {
    lignes.push([
      obligation.id,
      obligation.reference,
      obligation.description,
      risque,
      "A evaluer",
      "Non evalue",
      "A justifier selon le contexte",
      "En attente"
    ]);
  }
}

// 4. Convertir en CSV
function echapperCSV(valeur: string): string {
  return `"${valeur.replace(/"/g, '""')}"`;
}

const contenuCSV = lignes
  .map(ligne => ligne.map(echapperCSV).join(";"))
  .join("\r\n");

// 5. Enregistrer le fichier
const cheminCSV = join(
  process.cwd(),
  "src",
  "resultats",
  "M2_impact.csv"
);

writeFileSync(
  cheminCSV,
  "\uFEFF" + contenuCSV,
  "utf-8"
);

// 6. Afficher le résultat
console.log("=================================");
console.log("       MATRICE M2 - IMPACT");
console.log("=================================");

console.log("\nMatrice créée avec succès !");
console.log("Nombre de lignes :", lignes.length - 1);
console.log("Fichier :", cheminCSV);