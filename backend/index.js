require('dotenv').config();
const express = require('express');
const { creaSessione, avviaRound, chiudiRound, getSessione, registraVoto } = require('./src/state');

const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'up' });
});

app.get('/test-sessione', (req, res) => {
  const sessione = creaSessione('comprehension', 'Prova');
  res.json(sessione);
});

app.get('/test-round', (req, res) => {
  const sessione = creaSessione('comprehension', 'Prova Round');
  const round = avviaRound(sessione.id, 'Test etichetta', null, 5);
  res.json({ sessioneId: sessione.id, round });
});

app.get('/test-voto/:sessioneId/:valore', (req, res) => {
  const round = registraVoto(req.params.sessioneId, 'client-prova', req.params.valore);
  if (!round) return res.status(400).json({ errore: 'voto non registrato (round non attivo o valore non valido)' });
  res.json(round);
});

app.get('/test-sessione/:id', (req, res) => {
  const sessione = getSessione(req.params.id);
  if (!sessione) return res.status(404).json({ errore: 'non trovata' });
  res.json(sessione);
});

app.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
});