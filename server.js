import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'fake-key-for-test',
});

// Route d'analyse pour le HUD
app.post('/api/summary', async (req, res) => {
  try {
    const { prompt } = req.body;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt || 'Analyse la zone' }],
    });
    res.json({ summary: completion.choices[0].message.content });
  } catch (error) {
    console.error('Erreur OpenAI:', error.message);
    res.status(500).json({ error: 'Échec de l’analyse IA' });
  }
});

// Route générique pour capturer les requêtes secondaires (diagnostics, defaults) et éviter les erreurs 500
app.all('*', (req, res) => {
  res.json({ status: 'ok', message: 'API active' });
});

app.listen(3000, () => {
  console.log('Serveur API prêt sur http://localhost:3000');
});