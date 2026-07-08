require('dotenv').config();
const express = require('express');
const { creaSessione } = require('./src/state');

const app = express();
const port = process.env.PORT || 3000;


app.get('/health', (req, res) => {
  res.json({ status: 'up' });
});

app.get('/test-sessione', (req, res) => {
  const sessione = creaSessione('comprehension', 'Prova');
  res.json(sessione);
});

app.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
});