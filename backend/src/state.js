const DURATA_ROUND_DEFAULT_SECONDI = 15;

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
  return round;
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

  return round;
}

module.exports = { OPZIONI_DEFAULT, creaSessione, getSessione, avviaRound, chiudiRound, registraVoto };