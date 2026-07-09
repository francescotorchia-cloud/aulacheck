const DURATA_ROUND_DEFAULT_SECONDI = 15;
const { broadcast } = require('./ws');

const OPZIONI_DEFAULT = {
  comprehension: ['confuso', 'ok', 'perso'],
  debate: ['squadra A', 'squadra B', 'neutro']
};

const sessioni = new Map();
const timersAttivi = new Map();


function generaId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function creaSessione(tipo, titolo) {
  const codice = Math.random().toString(36).slice(2, 8).toUpperCase();
  const sessione = {
    id: generaId(),
    tipo,
    titolo,
    codice,
    chiusa: false,
    roundAttivo: null,
    roundPianificati: [],
    storico: []
  };
  sessioni.set(sessione.id, sessione);
  return sessione;
}

function getSessione(id) {
  return sessioni.get(id);
}

function getSessionePerCodice(codice) {
  for (const sessione of sessioni.values()) {
    if (sessione.codice === codice) return sessione;
  }
  return null;
}

function avviaRound(sessioneId, etichetta, opzioniCustom, durataSecondi = DURATA_ROUND_DEFAULT_SECONDI) {
  const sessione = sessioni.get(sessioneId);
  if (!sessione) return null;

  if (sessione.roundAttivo) {
    chiudiRound(sessioneId);
  }

  const opzioni = opzioniCustom || OPZIONI_DEFAULT[sessione.tipo] || [];

  const round = {
    id: generaId(),
    etichetta: etichetta || null,
    opzioni,
    durataSecondi,
    iniziatoIl: Date.now(),
    terminatoIl: null,
    stato: 'attivo',
    voti: {}
  };

  const timer = setTimeout(() => chiudiRound(sessioneId), durataSecondi * 1000);
  timersAttivi.set(round.id, timer);

  sessione.roundAttivo = round;
  return round;
}


function registraVoto(sessioneId, clientId, valore) {
  const sessione = sessioni.get(sessioneId);
  if (!sessione || !sessione.roundAttivo) return null;

  const round = sessione.roundAttivo;
  if (!round.opzioni.includes(valore)) return null;

  round.voti[clientId] = valore;

  broadcast(sessioneId, { tipo: 'aggiornamento-voti', conteggio: aggregaVoti(round) });

  return round;
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

function chiudiRound(sessioneId) {
  const sessione = sessioni.get(sessioneId);
  if (!sessione || !sessione.roundAttivo) return null;

  const round = sessione.roundAttivo;

  const timer = timersAttivi.get(round.id);
  if (timer) {
    clearTimeout(timer);
    timersAttivi.delete(round.id);
  }

  round.stato = 'chiuso';
  round.terminatoIl = Date.now();

  sessione.storico.push(round);
  sessione.roundAttivo = null;

  console.log(`Round ${round.id} chiuso alle ${new Date(round.terminatoIl).toLocaleTimeString()}`);

  broadcast(sessioneId, { tipo: 'round-chiuso', conteggio: aggregaVoti(round) });

  return round;
}

module.exports = { OPZIONI_DEFAULT, creaSessione, getSessione, getSessionePerCodice, avviaRound, chiudiRound, registraVoto, aggregaVoti };