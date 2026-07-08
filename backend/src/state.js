const OPZIONI_DEFAULT = {
  comprehension: ['confuso', 'ok', 'perso'],
  debate: ['squadra A', 'squadra B', 'neutro']
};

const sessioni = new Map();

function creaSessione(tipo, titolo) {
  const id = Date.now().toString(36);
  const codice = Math.random().toString(36).slice(2, 8).toUpperCase();
  const sessione = {
    id, tipo, titolo, codice,
    chiusa: false,
    roundAttivo: null,
    roundPianificati: [],
    storico: []
  };
  sessioni.set(id, sessione);
  return sessione;
}

function getSessione(id) {
  return sessioni.get(id);
}

module.exports = { OPZIONI_DEFAULT, creaSessione, getSessione };    