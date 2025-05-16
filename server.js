const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static("public"));

app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Connexion MongoDB

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let scoresCollection;

async function startDb() {
  await client.connect();
  const db = client.db("snakegame");
  scoresCollection = db.collection("scores");
}
startDb().catch(console.error);

// Routes
app.get("/api/scores", async (req, res) => {
  const top10 = await scoresCollection
    .find()
    .sort({ score: -1 })
    .limit(10)
    .toArray();
  res.json(top10);
});

app.post("/api/scores", async (req, res) => {
  const { name, score } = req.body;
  await scoresCollection.insertOne({ name, score });
  res.status(201).end();
});

app.listen(port, () => {
  console.log(`API Server listening at http://localhost:${port}`);
});
