import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// 1. Définir la structure des données attendues
const ObligationSchema = z.object({
  id: z.string(),
  reference: z.string(),
  description: z.string(),
  mesures: z.array(z.string()),
  risques: z.array(z.string())
});

const AnalyseSchema = z.object({
  obligations: z.array(ObligationSchema)
});

// 2. Charger le document RGPD
// 2. Charger le document à analyser

const cheminDocument = process.argv[2]
  ? process.argv[2]
  : join(
      process.cwd(),
      "src",
      "documents",
      "rgpd_article32.txt"
    );

const texteRGPD = readFileSync(cheminDocument, "utf-8");

console.log("Document analysé :", cheminDocument);

console.log("==================================");
console.log("       AGENT IA DE VEILLE GRC");
console.log("==================================");

console.log("\nDocument RGPD chargé avec succès !");

// 3. Préparer les instructions pour Qwen
const prompt = `
Tu es un analyste spécialisé en cybersécurité et conformité RGPD.

Analyse uniquement le texte suivant :

${texteRGPD}

Identifie les obligations réglementaires.

Pour chaque obligation, indique :
- Un identifiant unique (OBL-001, OBL-002, etc.)
- La référence juridique
- Une description simple
- Les mesures de sécurité possibles
- Les risques de non-conformité

Règles importantes :
- N'invente aucune obligation juridique.
- Ne présente pas une recommandation comme une obligation.
- Utilise uniquement le texte fourni.
- Réponds uniquement avec un objet JSON valide.
- N'ajoute aucun texte avant ou après le JSON.

Respecte exactement cette structure :

{
  "obligations": [
    {
      "id": "OBL-001",
      "reference": "RGPD - Article 32",
      "description": "Description de l'obligation",
      "mesures": ["Mesure 1", "Mesure 2"],
      "risques": ["Risque 1", "Risque 2"]
    }
  ]
}
`;

// 4. Interroger Ollama
async function analyserRGPD() {
  console.log("\nAnalyse IA en cours...\n");

  try {
    const reponse = await fetch(
      "http://localhost:11434/api/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "qwen2.5:7b",
          prompt: prompt,
          stream: false,
          format: "json"
        })
      }
    );

    if (!reponse.ok) {
      throw new Error(`Erreur Ollama : ${reponse.status}`);
    }

    const resultat = await reponse.json() as {
      response: string;
    };

    // 5. Convertir la réponse en objet JSON
    const donnees = JSON.parse(resultat.response);

    // 6. Vérifier la structure avec Zod
    const analyse = AnalyseSchema.parse(donnees);

    console.log("Analyse JSON validée avec succès !");

    // 7. Créer le dossier de résultats
    const dossierResultats = join(
      process.cwd(),
      "src",
      "resultats"
    );

    mkdirSync(dossierResultats, { recursive: true });

    // 8. Enregistrer le fichier JSON
    const cheminResultat = join(
      dossierResultats,
      "obligations_rgpd.json"
    );

    writeFileSync(
      cheminResultat,
      JSON.stringify(analyse, null, 2),
      "utf-8"
    );

    console.log("\n===== OBLIGATIONS IDENTIFIÉES =====\n");

    console.log(JSON.stringify(analyse, null, 2));

    console.log("\nNombre d'obligations :", analyse.obligations.length);

    console.log("\nFichier créé :", cheminResultat);

    console.log("\n===== FIN DE L'ANALYSE =====");

  } catch (erreur) {
    console.error("\nErreur pendant l'analyse :", erreur);
  }
}

analyserRGPD();