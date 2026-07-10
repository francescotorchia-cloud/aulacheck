require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./src/db');
const { creaSessione, avviaRound, chiudiRound, getSessione, getSessionePerCodice, registraVoto, aggregaVoti, pianificaRound, getRoundPianificati, lanciaProssimoPianificato } = require('./src/state');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

function richiedeAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ errore: 'token mancante' });
  }

  const token = authHeader.slice(7);
  try {
    req.docente = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ errore: 'token non valido o scaduto' });
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'up' });
});



app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (email !== process.env.DOCENTE_EMAIL) {
    return res.status(401).json({ errore: 'credenziali non valide' });
  }

  const passwordCorretta = await bcrypt.compare(password, process.env.DOCENTE_PASSWORD_HASH);
  if (!passwordCorretta) {
    return res.status(401).json({ errore: 'credenziali non valide' });
  }

  const token = jwt.sign({ ruolo: 'docente' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

app.post('/sessioni', richiedeAuth, async (req, res) => {
  const { tipo, titolo } = req.body;
  const sessione = await creaSessione(tipo, titolo);
  res.json(sessione);
});

app.get('/sessioni/:id', async (req, res) => {
  const sessione = await getSessione(req.params.id);
  if (!sessione) return res.status(404).json({ errore: 'sessione non trovata' });
  res.json(sessione);
});

app.get('/sessioni/codice/:codice', async (req, res) => {
  const codice = req.params.codice.toUpperCase();
  const sessione = await getSessionePerCodice(codice);
  if (!sessione) return res.status(404).json({ errore: 'sessione non trovata' });
  res.json(sessione);
});

app.post('/sessioni/:id/round', richiedeAuth, async (req, res) => {
  const { etichetta, opzioni, durataSecondi } = req.body;
  const round = await avviaRound(req.params.id, etichetta, opzioni, durataSecondi);
  if (!round) return res.status(404).json({ errore: 'sessione non trovata' });
  res.json(round);
});

app.post('/sessioni/:id/pianifica', richiedeAuth, async (req, res) => {
  const { etichetta, opzioni, durataSecondi } = req.body;
  const pianificato = await pianificaRound(req.params.id, etichetta, opzioni, durataSecondi);
  res.json(pianificato);
});

app.get('/sessioni/:id/pianificati', richiedeAuth, async (req, res) => {
  const lista = await getRoundPianificati(req.params.id);
  res.json(lista);
});

app.post('/sessioni/:id/lancia-prossimo', richiedeAuth, async (req, res) => {
  const round = await lanciaProssimoPianificato(req.params.id);
  if (!round) return res.status(404).json({ errore: 'nessun round pianificato da lanciare' });
  res.json(round);
});

app.post('/sessioni/:id/round/chiudi', richiedeAuth, async (req, res) => {
  const round = await chiudiRound(req.params.id);
  if (!round) return res.status(404).json({ errore: 'nessun round attivo su questa sessione' });
  res.json(round);
});

app.post('/sessioni/:id/voto', async (req, res) => {
  const { clientId, valore } = req.body;
  const round = await registraVoto(req.params.id, clientId, valore);
  if (!round) return res.status(400).json({ errore: 'voto non registrato (round non attivo o valore non valido)' });
  res.json(round);
});

app.get('/sessioni/:id/storico', richiedeAuth, async (req, res) => {
  const sessione = await getSessione(req.params.id);
  if (!sessione) return res.status(404).json({ errore: 'sessione non trovata' });
  res.json(sessione.storico);
});

const http = require('http');
const { avviaWebSocket } = require('./src/ws');

const server = http.createServer(app);
avviaWebSocket(server);

server.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
});