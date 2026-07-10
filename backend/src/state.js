const DURATA_ROUND_DEFAULT_SECONDI = 15;
const { broadcast } = require('./ws');
const pool = require('./db');

const OPZIONI_DEFAULT = {
  comprehension: ['confuso', 'ok', 'perso'],
  debate: ['squadra A', 'squadra B', 'neutro']
};

const timersAttivi = new Map();

function generaId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function creaSessione(tipo, titolo) {
  const id = generaId();
  const codice = Math.random().toString(36).slice(2, 8).toUpperCase();

  await pool.query(
    'INSERT INTO sessioni (id, tipo, titolo, codice) VALUES ($1, $2, $3, $4)',
    [id, tipo, titolo, codice]
  );

  return { id, tipo, titolo, codice, chiusa: false, roundAttivo: null, storico: [] };
}

async function getSessione(id) {
  const risultato = await pool.query('SELECT * FROM sessioni WHERE id = $1', [id]);
  if (risultato.rows.length === 0) return null;

  const sessione = risultato.rows[0];
  sessione.roundAttivo = await getRoundAttivoArricchito(id);
  sessione.storico = await getStorico(id);
  return sessione;
}

async function getSessionePerCodice(codice) {
  const risultato = await pool.query('SELECT id FROM sessioni WHERE codice = $1', [codice]);
  if (risultato.rows.length === 0) return null;
  return await getSessione(risultato.rows[0].id);
}

async function getRoundAttivoArricchito(sessioneId) {
  const risultato = await pool.query(
    "SELECT * FROM round WHERE sessione_id = $1 AND stato = 'attivo' LIMIT 1",
    [sessioneId]
  );
  if (risultato.rows.length === 0) return null;
  return await arricchisciRound(risultato.rows[0]);
}

async function getStorico(sessioneId) {
  const risultato = await pool.query(
    "SELECT * FROM round WHERE sessione_id = $1 AND stato = 'chiuso' ORDER BY iniziato_il",
    [sessioneId]
  );
  const rounds = [];
  for (const row of risultato.rows) {
    rounds.push(await arricchisciRound(row));
  }
  return rounds;
}

async function arricchisciRound(row) {
  const votiRisultato = await pool.query('SELECT client_id, valore FROM voti WHERE round_id = $1', [row.id]);
  const voti = {};
  votiRisultato.rows.forEach(v => voti[v.client_id] = v.valore);

  return {
    id: row.id,
    etichetta: row.etichetta,
    opzioni: row.opzioni,
    durataSecondi: row.durata_secondi,
    iniziatoIl: new Date(row.iniziato_il).getTime(),
    terminatoIl: row.terminato_il ? new Date(row.terminato_il).getTime() : null,
    stato: row.stato,
    voti
  };
}

async function avviaRound(sessioneId, etichetta, opzioniCustom, durataSecondi = DURATA_ROUND_DEFAULT_SECONDI) {
  const sessioneRisultato = await pool.query('SELECT tipo FROM sessioni WHERE id = $1', [sessioneId]);
  if (sessioneRisultato.rows.length === 0) return null;
  const tipo = sessioneRisultato.rows[0].tipo;

  const roundAttivo = await getRoundAttivoArricchito(sessioneId);
  if (roundAttivo) {
    await chiudiRound(sessioneId);
  }

  const opzioni = opzioniCustom || OPZIONI_DEFAULT[tipo] || [];
  const id = generaId();
  const iniziatoIl = Date.now();

  await pool.query(
    'INSERT INTO round (id, sessione_id, etichetta, opzioni, durata_secondi, iniziato_il, stato) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, sessioneId, etichetta || null, JSON.stringify(opzioni), durataSecondi, new Date(iniziatoIl), 'attivo']
  );

  const timer = setTimeout(() => chiudiRound(sessioneId), durataSecondi * 1000);
  timersAttivi.set(id, timer);

  const round = { id, etichetta: etichetta || null, opzioni, durataSecondi, iniziatoIl, terminatoIl: null, stato: 'attivo', voti: {} };

  broadcast(sessioneId, { tipo: 'round-avviato', round });

  return round;
}

async function registraVoto(sessioneId, clientId, valore) {
  const roundAttivo = await getRoundAttivoArricchito(sessioneId);
  if (!roundAttivo) return null;
  if (!roundAttivo.opzioni.includes(valore)) return null;

  await pool.query(
    `INSERT INTO voti (round_id, client_id, valore) VALUES ($1, $2, $3)
     ON CONFLICT (round_id, client_id) DO UPDATE SET valore = EXCLUDED.valore, aggiornato_il = now()`,
    [roundAttivo.id, clientId, valore]
  );

  const roundAggiornato = await arricchisciRound({ ...roundAttivo, id: roundAttivo.id });
  broadcast(sessioneId, { tipo: 'aggiornamento-voti', conteggio: aggregaVoti(roundAggiornato) });

  return roundAggiornato;
}

function aggregaVoti(round) {
  const conteggio = {};
  for (const opzione of round.opzioni) {
    conteggio[opzione] = 0;
  }
  for (const valore of Object.values(round.voti)) {
    conteggio[valore] = (conteggio[valore] || 0) + 1;
  }
  return conteggio;
}

async function chiudiRound(sessioneId) {
  const roundAttivo = await getRoundAttivoArricchito(sessioneId);
  if (!roundAttivo) return null;

  const timer = timersAttivi.get(roundAttivo.id);
  if (timer) {
    clearTimeout(timer);
    timersAttivi.delete(roundAttivo.id);
  }

  const terminatoIl = new Date();
  await pool.query(
    "UPDATE round SET stato = 'chiuso', terminato_il = $1 WHERE id = $2",
    [terminatoIl, roundAttivo.id]
  );

  roundAttivo.stato = 'chiuso';
  roundAttivo.terminatoIl = terminatoIl.getTime();

  console.log(`Round ${roundAttivo.id} chiuso alle ${terminatoIl.toLocaleTimeString()}`);

  broadcast(sessioneId, { tipo: 'round-chiuso', conteggio: aggregaVoti(roundAttivo) });

  return roundAttivo;
}

module.exports = { OPZIONI_DEFAULT, creaSessione, getSessione, getSessionePerCodice, avviaRound, chiudiRound, registraVoto, aggregaVoti };