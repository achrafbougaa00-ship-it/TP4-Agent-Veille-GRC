import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// 1. Lire les obligations générées par l'IA
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

// 2. Définir les colonnes de notre matrice
const lignes: string[][] = [
  [
    "ID",
    "Reference juridique",
    "Obligation",
    "Mesure de securite",
    "Preuve attendue",
    "Statut"
  ]
];

// 3. Associer les mesures aux obligations
for (const obligation of donnees.obligations) {
  for (const mesure of obligation.mesures) {
    lignes.push([
      obligation.id,
      obligation.reference,
      obligation.description,
      mesure,
      "A renseigner",
      "A verifier"
    ]);
  }
}

// 4. Convertir les données au format CSV
function echapperCSV(valeur: string): string {
  return `"${valeur.replace(/"/g, '""')}"`;
}

const contenuCSV = lignes
  .map(ligne => ligne.map(echapperCSV).join(";"))
  .join("\r\n");

// 5. Enregistrer la matrice
const cheminCSV = join(
  process.cwd(),
  "src",
  "resultats",
  "M1_tracabilite.csv"
);

writeFileSync(
  cheminCSV,
  "\uFEFF" + contenuCSV,
  "utf-8"
);

console.log("=================================");
console.log("    MATRICE M1 - TRACABILITE");
console.log("=================================");

console.log("\nMatrice créée avec succès !");
console.log("Nombre de lignes :", lignes.length - 1);
console.log("Fichier :", cheminCSV);