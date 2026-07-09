require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { creaSessione, avviaRound, chiudiRound, getSessione, registraVoto, aggregaVoti } = require('./src/state');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

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

app.post('/sessioni', richiedeAuth, (req, res) => {
  const { tipo, titolo } = req.body;
  const sessione = creaSessione(tipo, titolo);
  res.json(sessione);
});

app.get('/test-sessione', (req, res) => {
  const sessione = creaSessione('comprehension', 'Prova');
  res.json(sessione);
});

app.get('/test-round', (req, res) => {
  const sessione = creaSessione('comprehension', 'Prova Round');
  const round = avviaRound(sessione.id, 'Test etichetta', null, 20);
  res.json({ sessioneId: sessione.id, round });
});

app.get('/test-voto/:sessioneId/:valore{/:clientId}', (req, res) => {
  const clientId = req.params.clientId || 'client-prova';
  const round = registraVoto(req.params.sessioneId, clientId, req.params.valore);
  if (!round) return res.status(400).json({ errore: 'voto non registrato (round non attivo o valore non valido)' });
  res.json(round);
});

app.get('/test-sessione/:id', (req, res) => {
  const sessione = getSessione(req.params.id);
  if (!sessione) return res.status(404).json({ errore: 'non trovata' });
  res.json(sessione);
});

app.get('/test-aggregazione/:sessioneId', (req, res) => {
  const sessione = getSessione(req.params.sessioneId);
  if (!sessione) return res.status(404).json({ errore: 'sessione non trovata' });

  const round = sessione.roundAttivo || sessione.storico[sessione.storico.length - 1];
  if (!round) return res.status(404).json({ errore: 'nessun round trovato' });

  res.json(aggregaVoti(round));
});

const http = require('http');
const { avviaWebSocket } = require('./src/ws');

const server = http.createServer(app);
avviaWebSocket(server);

server.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
});