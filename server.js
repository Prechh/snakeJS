require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// ======== Connexion MongoDB ========
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let scoresCollection;

async function startDb() {
  try {
    await client.connect();
    const db = client.db("snakegame");
    scoresCollection = db.collection("scores");
    console.log("✅ Connexion à MongoDB établie.");
  } catch (err) {
    console.error("❌ Erreur connexion MongoDB :", err);
    throw err;
  }
}

// ======== Routes ========
app.get("/api/scores", async (req, res) => {
  if (!scoresCollection) {
    return res.status(500).json({ error: "Database not initialized" });
  }
  try {
    const top10 = await scoresCollection
      .find()
      .sort({ score: -1 })
      .limit(10)
      .toArray();
    res.json(top10);
  } catch (err) {
    console.error("❌ Erreur get /api/scores:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/scores", async (req, res) => {
  if (!scoresCollection) {
    return res.status(500).json({ error: "Database not initialized" });
  }
  const { name, score } = req.body;
  if (!name || typeof score !== "number") {
    return res.status(400).json({ error: "Nom ou score invalide" });
  }

  try {
    await scoresCollection.insertOne({ name, score });
    res.status(201).end();
  } catch (err) {
    console.error("❌ Erreur post /api/scores:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ======== Démarrage ========
startDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`✅ Serveur lancé sur http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Impossible de démarrer le serveur :", err);
    process.exit(1);
  });
