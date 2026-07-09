const schermataLogin = document.getElementById('schermata-login');
const schermataCrea = document.getElementById('schermata-crea');
const dashboard = document.getElementById('dashboard');

const inputEmail = document.getElementById('input-email');
const inputPassword = document.getElementById('input-password');
const btnLogin = document.getElementById('btn-login');
const erroreLogin = document.getElementById('errore-login');

const inputTitolo = document.getElementById('input-titolo');
const inputTipo = document.getElementById('input-tipo');
const btnCrea = document.getElementById('btn-crea');

const dashTitolo = document.getElementById('dash-titolo');
const dashCodice = document.getElementById('dash-codice');

const pannelloAttesa = document.getElementById('pannello-attesa');
const pannelloRound = document.getElementById('pannello-round');
const inputEtichetta = document.getElementById('input-etichetta');
const inputDurata = document.getElementById('input-durata');
const btnAvviaRound = document.getElementById('btn-avvia-round');
const btnChiudiRound = document.getElementById('btn-chiudi-round');

const dashTimer = document.getElementById('dash-timer');
const dashEtichetta = document.getElementById('dash-etichetta');
const risultatiLive = document.getElementById('risultati-live');

const btnStorico = document.getElementById('btn-storico');
const listaStorico = document.getElementById('lista-storico');

let token = null;
let sessioneId = null;
let ws = null;
let intervalloTimer = null;

function mostraSchermata(schermata) {
  [schermataLogin, schermataCrea, dashboard].forEach(s => s.classList.add('nascosta'));
  schermata.classList.remove('nascosta');
}

async function fai(url, opzioni = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opzioni.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const risposta = await fetch(url, { ...opzioni, headers });
  const dati = await risposta.json();
  if (!risposta.ok) throw new Error(dati.errore || 'errore sconosciuto');
  return dati;
}

async function login() {
  try {
    const dati = await fai('/login', {
      method: 'POST',
      body: JSON.stringify({ email: inputEmail.value, password: inputPassword.value })
    });
    token = dati.token;
    mostraSchermata(schermataCrea);
  } catch (e) {
    erroreLogin.textContent = 'Credenziali non valide';
  }
}

async function creaSessione() {
  const sessione = await fai('/sessioni', {
    method: 'POST',
    body: JSON.stringify({ tipo: inputTipo.value, titolo: inputTitolo.value || 'Sessione senza titolo' })
  });

  sessioneId = sessione.id;
  dashTitolo.textContent = sessione.titolo;
  dashCodice.textContent = sessione.codice;

  connettiWebSocket();
  mostraSchermata(dashboard);
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
      mostraRoundAttivo(messaggio.round);
    }

    if (messaggio.tipo === 'aggiornamento-voti') {
      disegnaRisultati(messaggio.conteggio);
    }

    if (messaggio.tipo === 'round-chiuso') {
      disegnaRisultati(messaggio.conteggio);
      fermaTimer();
      pannelloRound.classList.add('nascosta');
      pannelloAttesa.classList.remove('nascosta');
    }
  };
}

function mostraRoundAttivo(round) {
  pannelloAttesa.classList.add('nascosta');
  pannelloRound.classList.remove('nascosta');
  dashEtichetta.textContent = round.etichetta || '';
  disegnaRisultati(Object.fromEntries(round.opzioni.map(o => [o, 0])));

  const scadenza = round.iniziatoIl + round.durataSecondi * 1000;
  avviaTimer(scadenza);
}

function avviaTimer(scadenza) {
  fermaTimer();
  intervalloTimer = setInterval(() => {
    const restanti = Math.max(0, Math.round((scadenza - Date.now()) / 1000));
    dashTimer.textContent = restanti;
    if (restanti <= 0) fermaTimer();
  }, 200);
}

function fermaTimer() {
  if (intervalloTimer) clearInterval(intervalloTimer);
  intervalloTimer = null;
}

function disegnaRisultati(conteggio) {
  const totale = Object.values(conteggio).reduce((a, b) => a + b, 0) || 1;

  risultatiLive.innerHTML = '';
  for (const [opzione, valore] of Object.entries(conteggio)) {
    const percentuale = Math.round((valore / totale) * 100);

    const riga = document.createElement('div');
    riga.className = 'barra-risultato';
    riga.innerHTML = `
      <span class="etichetta-opzione">${opzione}</span>
      <div class="barra-contenitore"><div class="barra-riempimento" style="width:${percentuale}%"></div></div>
      <span class="conteggio">${valore}</span>
    `;
    risultatiLive.appendChild(riga);
  }
}

async function avviaRound() {
  await fai(`/sessioni/${sessioneId}/round`, {
    method: 'POST',
    body: JSON.stringify({
      etichetta: inputEtichetta.value,
      durataSecondi: Number(inputDurata.value) || 15
    })
  });
}

async function chiudiRound() {
  await fai(`/sessioni/${sessioneId}/round/chiudi`, { method: 'POST' });
}

async function mostraStorico() {
  const storico = await fai(`/sessioni/${sessioneId}/storico`);

  listaStorico.innerHTML = '';
  storico.forEach(round => {
    const voce = document.createElement('div');
    voce.className = 'voce-storico';
    const conteggio = Object.entries(aggregaLocale(round)).map(([o, v]) => `${o}: ${v}`).join(', ');
    voce.textContent = `${round.etichetta || '(senza etichetta)'} — ${conteggio}`;
    listaStorico.appendChild(voce);
  });
  listaStorico.classList.remove('nascosta');
}

function aggregaLocale(round) {
  const conteggio = {};
  round.opzioni.forEach(o => conteggio[o] = 0);
  Object.values(round.voti).forEach(v => conteggio[v] = (conteggio[v] || 0) + 1);
  return conteggio;
}

btnLogin.addEventListener('click', login);
btnCrea.addEventListener('click', creaSessione);
btnAvviaRound.addEventListener('click', avviaRound);
btnChiudiRound.addEventListener('click', chiudiRound);
btnStorico.addEventListener('click', mostraStorico);