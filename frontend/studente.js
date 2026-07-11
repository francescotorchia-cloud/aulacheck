const parametriUrl = new URLSearchParams(location.search);
const codiceDaUrl = parametriUrl.get('codice');

const schermataCodice = document.getElementById('schermata-codice');
const schermataAttesa = document.getElementById('schermata-attesa');
const schermataVoto = document.getElementById('schermata-voto');

const inputCodice = document.getElementById('input-codice');
const btnEntra = document.getElementById('btn-entra');
const erroreCodice = document.getElementById('errore-codice');
const titoloSessione = document.getElementById('titolo-sessione');

const timerEl = document.getElementById('timer');
const etichettaRoundEl = document.getElementById('etichetta-round');
const opzioniVotoEl = document.getElementById('opzioni-voto');
const statoVotoEl = document.getElementById('stato-voto');

const clientId = 'studente-' + Math.random().toString(36).slice(2, 10);

let sessioneId = null;
let ws = null;
let intervalloTimer = null;

function mostraSchermata(schermata) {
  [schermataCodice, schermataAttesa, schermataVoto].forEach(s => s.classList.add('nascosta'));
  schermata.classList.remove('nascosta');
}

async function entraNellaSessione() {
  const codice = inputCodice.value.trim().toUpperCase();
  if (codice.length !== 6) {
    erroreCodice.textContent = 'Il codice deve avere 6 caratteri';
    return;
  }

  try {
    const risposta = await fetch(`/sessioni/codice/${codice}`);
    if (!risposta.ok) {
      erroreCodice.textContent = 'Sessione non trovata';
      return;
    }

    const sessione = await risposta.json();
    sessioneId = sessione.id;
    titoloSessione.textContent = sessione.titolo;

    connettiWebSocket();

    if (sessione.roundAttivo) {
      mostraRound(sessione.roundAttivo);
    } else {
      mostraSchermata(schermataAttesa);
    }
  } catch {
    erroreCodice.textContent = 'Errore di connessione al server';
  }
}

function connettiWebSocket() {
  const protocollo = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocollo}//${location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ tipo: 'iscriviti', sessioneId }));
  };

  ws.onmessage = (evento) => {
    const messaggio = JSON.parse(evento.data);

    if (messaggio.tipo === 'round-avviato') {
      mostraRound(messaggio.round);
    }

    if (messaggio.tipo === 'round-chiuso') {
      fermaTimer();
      mostraSchermata(schermataAttesa);
    }
  };
}

function mostraRound(round) {
  mostraSchermata(schermataVoto);
  etichettaRoundEl.textContent = round.etichetta || '';
  statoVotoEl.textContent = '';

  opzioniVotoEl.innerHTML = '';
  round.opzioni.forEach(opzione => {
    const btn = document.createElement('button');
    btn.className = 'opzione-btn';
    btn.textContent = opzione;
    btn.addEventListener('click', () => votaOpzione(opzione, btn));
    opzioniVotoEl.appendChild(btn);
  });

  const scadenza = round.iniziatoIl + round.durataSecondi * 1000;
  avviaTimer(scadenza);
}

function avviaTimer(scadenza) {
  fermaTimer();
  intervalloTimer = setInterval(() => {
    const restanti = Math.max(0, Math.round((scadenza - Date.now()) / 1000));
    timerEl.textContent = restanti;
    timerEl.classList.toggle('urgente', restanti <= 5);
    if (restanti <= 0) fermaTimer();
  }, 200);
}

function fermaTimer() {
  if (intervalloTimer) clearInterval(intervalloTimer);
  intervalloTimer = null;
}

async function votaOpzione(valore, btnCliccato) {
  document.querySelectorAll('.opzione-btn').forEach(b => b.classList.remove('selezionata'));
  btnCliccato.classList.add('selezionata');

  try {
    await fetch(`/sessioni/${sessioneId}/voto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, valore })
    });
    statoVotoEl.textContent = 'Voto registrato';
  } catch {
    statoVotoEl.textContent = 'Errore nel registrare il voto';
  }
}

btnEntra.addEventListener('click', entraNellaSessione);
inputCodice.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') entraNellaSessione();
});

if (codiceDaUrl) {
  inputCodice.value = codiceDaUrl.toUpperCase();
  entraNellaSessione();
}