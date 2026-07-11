const schermataLogin = document.getElementById('schermata-login');
    const schermataCrea = document.getElementById('schermata-crea');
    const schermataLista = document.getElementById('schermata-lista');
    const elencoSessioni = document.getElementById('elenco-sessioni');
    const btnNuovaSessione = document.getElementById('btn-nuova-sessione');
    const btnAnnullaCrea = document.getElementById('btn-annulla-crea');
    const dashboard = document.getElementById('dashboard');

    const inputEmail = document.getElementById('input-email');
    const inputPassword = document.getElementById('input-password');
    const btnLogin = document.getElementById('btn-login');
    const erroreLogin = document.getElementById('errore-login');

    const inputTitolo = document.getElementById('input-titolo');
    const btnCrea = document.getElementById('btn-crea');

    const dashTitolo = document.getElementById('dash-titolo');
    const dashCodice = document.getElementById('dash-codice');

    const btnProietta = document.getElementById('btn-proietta');
    const overlayProiezione = document.getElementById('overlay-proiezione');
    const proiezioneTitolo = document.getElementById('proiezione-titolo');
    const proiezioneCodice = document.getElementById('proiezione-codice');
    const btnChiudiProiezione = document.getElementById('btn-chiudi-proiezione');

    const dueColonne = document.getElementById('due-colonne');
    const pannelloRound = document.getElementById('pannello-round');
    const inputEtichetta = document.getElementById('input-etichetta');
    const inputDurata = document.getElementById('input-durata');
    const btnAvviaRound = document.getElementById('btn-avvia-round');
    const btnChiudiRound = document.getElementById('btn-chiudi-round');
    const btnTornaLista = document.getElementById('btn-torna-lista');

    const dashTimer = document.getElementById('dash-timer');
    const dashEtichetta = document.getElementById('dash-etichetta');
    const risultatiLive = document.getElementById('risultati-live');

    const btnStorico = document.getElementById('btn-storico');
    const listaStorico = document.getElementById('lista-storico');

    const inputEtichettaPianifica = document.getElementById('input-etichetta-pianifica');
    const inputDurataPianifica = document.getElementById('input-durata-pianifica');
    const btnPianifica = document.getElementById('btn-pianifica');
    const listaPianificati = document.getElementById('lista-pianificati');
    const btnRoundSuccessivo = document.getElementById('btn-round-successivo');
    const btnChiudiSessione = document.getElementById('btn-chiudi-sessione');

    const inputRiprendiCodice = document.getElementById('input-riprendi-codice');
    const btnRiprendi = document.getElementById('btn-riprendi');
    const inputTipoRoundPianifica = document.getElementById('input-tipo-round-pianifica');
    const inputOpzioniCustomPianifica = document.getElementById('input-opzioni-custom-pianifica');
    const inputTipoRoundVeloce = document.getElementById('input-tipo-round-veloce');
    const inputOpzioniCustomVeloce = document.getElementById('input-opzioni-custom-veloce');
    const erroreRiprendi = document.getElementById('errore-riprendi');

    let token = null;
    let sessioneId = null;
    let ws = null;
    let intervalloTimer = null;

    function mostraSchermata(schermata) {
      [schermataLogin, schermataLista, schermataCrea, dashboard].forEach(s => s.classList.add('nascosta'));
      schermata.classList.remove('nascosta');
    }

    function calcolaOpzioni(selectTipo, inputCustom) {
      if (selectTipo.value === 'custom') {
          return inputCustom.value.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (selectTipo.value === 'truefalse') {
          return ['vero', 'falso'];
        }
        if (selectTipo.value === 'debate') {
          return ['squadra A', 'squadra B', 'neutro'];
        }
        return null;
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
        await mostraElencoSessioni();
      } catch (e) {
        erroreLogin.textContent = 'Credenziali non valide';
      }
    }
    async function mostraElencoSessioni() {
      const lista = await fai('/sessioni');

      elencoSessioni.innerHTML = '';
      if (lista.length === 0) {
        elencoSessioni.innerHTML = '<p class="sottotitolo">Nessuna sessione ancora creata.</p>';
      } else {
        lista.forEach(s => {
          const voce = document.createElement('div');
          voce.className = 'voce-sessione';
          voce.innerHTML = `
            <div class="info-voce-sessione">
              <div class="titolo-sessione-voce">${s.titolo || '(senza titolo)'}</div>
              <div class="dettagli-sessione-voce">${s.codice} · ${s.tipo}</div>
            </div>
            <button class="btn-elimina-sessione">Elimina</button>
          `;
          voce.querySelector('.info-voce-sessione').addEventListener('click', () => apriSessioneEsistente(s.id));
          voce.querySelector('.btn-elimina-sessione').addEventListener('click', (e) => {
            e.stopPropagation();
            eliminaSessioneConConferma(s.id, s.titolo || 'questa sessione');
          });
          elencoSessioni.appendChild(voce);
        });
      }

      mostraSchermata(schermataLista);
    }

    function generaQR(codice) {
        const url = `${location.origin}/studente.html?codice=${codice}`;
        const canvas = document.getElementById('qr-codice');
        QRCode.toCanvas(canvas, url, { width: 140, margin: 1, color: { dark: '#F2F0EB', light: '#14171A' } });
      }

    function apriProiezione() {
        proiezioneTitolo.textContent = dashTitolo.textContent;
        proiezioneCodice.textContent = dashCodice.textContent;

        const canvas = document.getElementById('qr-proiezione');
        const url = `${location.origin}/studente.html?codice=${dashCodice.textContent}`;
        QRCode.toCanvas(canvas, url, { width: 320, margin: 1, color: { dark: '#F2F0EB', light: '#14171A' } });

        overlayProiezione.classList.remove('nascosta');
      }

      function chiudiProiezione() {
        overlayProiezione.classList.add('nascosta');
      }

      async function eliminaSessioneConConferma(id, titolo) {
        const conferma = confirm(`Eliminare definitivamente "${titolo}"? Questa azione non può essere annullata.`);
        if (!conferma) return;

        await fai(`/sessioni/${id}`, { method: 'DELETE' });
        await mostraElencoSessioni();
      }
      async function chiudiSessioneConConferma() {
        const conferma = confirm('Chiudere definitivamente questa sessione? Non potrai più avviare round su di essa.');
        if (!conferma) return;

        await fai(`/sessioni/${sessioneId}/chiudi`, { method: 'POST' });
        if (ws) ws.close();
        await mostraElencoSessioni();
      }





      async function apriSessioneEsistente(id) {
        const sessione = await fai(`/sessioni/${id}/apri`);
        sessioneId = sessione.id;
        dashTitolo.textContent = sessione.titolo;
        dashCodice.textContent = sessione.codice;
        generaQR(sessione.codice);

        connettiWebSocket();
        mostraSchermata(dashboard);
        await aggiornaListaPianificati();

        if (sessione.roundAttivo) {
          mostraRoundAttivo(sessione.roundAttivo);
        }
      }

    async function creaSessione() {
      if (!inputTitolo.value.trim()) {
        alert('Inserisci un titolo per la sessione');
        return;
      }

      const sessione = await fai('/sessioni', {
        method: 'POST',
        body: JSON.stringify({ tipo: 'comprehension', titolo: inputTitolo.value.trim() })
      });

      sessioneId = sessione.id;
      dashTitolo.textContent = sessione.titolo;
      dashCodice.textContent = sessione.codice;
      generaQR(sessione.codice);

      connettiWebSocket();
      mostraSchermata(dashboard);
      await aggiornaListaPianificati();
    }




    async function pianificaRound() {
      await fai(`/sessioni/${sessioneId}/pianifica`, {
        method: 'POST',
        body: JSON.stringify({
          etichetta: inputEtichettaPianifica.value,
          opzioni: calcolaOpzioni(inputTipoRoundPianifica, inputOpzioniCustomPianifica),
          durataSecondi: Number(inputDurataPianifica.value) || 15
        })
      });
      inputEtichettaPianifica.value = '';
      await aggiornaListaPianificati();
    }

    async function aggiornaListaPianificati() {
      const lista = await fai(`/sessioni/${sessioneId}/pianificati`);
      const nonLanciati = lista.filter(p => !p.lanciato);

      listaPianificati.innerHTML = '';
      lista.forEach(p => {
        const indice = nonLanciati.findIndex(n => n.id === p.id);
        const eSuPrimo = indice === 0;
        const eUltimo = indice === nonLanciati.length - 1;

        const voce = document.createElement('div');
        voce.className = 'voce-pianificata' + (p.lanciato ? ' lanciata' : '');
        voce.innerHTML = `
        <span class="numero-ordine">${p.ordine}</span>
        <span class="info-voce">
        <span class="etichetta-voce">${p.etichetta || '(senza etichetta)'}</span>
        <span class="durata-voce">${p.durataSecondi}s</span>
        </span>
        <span class="controlli-voce">
        <button class="su" ${p.lanciato || eSuPrimo ? 'disabled' : ''}>▲</button>
        <button class="giu" ${p.lanciato || eUltimo ? 'disabled' : ''}>▼</button>
        <button class="elimina" ${p.lanciato ? 'disabled' : ''}>✕</button>
        </span>
    `;

        if (!p.lanciato) {
          voce.querySelector('.su').addEventListener('click', () => spostaPianificato(p.id, 'su'));
          voce.querySelector('.giu').addEventListener('click', () => spostaPianificato(p.id, 'giu'));
          voce.querySelector('.elimina').addEventListener('click', () => eliminaPianificato(p.id));
        }

        listaPianificati.appendChild(voce);
      });
    }

    async function spostaPianificato(id, direzione) {
      try {
        await fai(`/sessioni/${sessioneId}/pianificati/${id}/sposta`, {
          method: 'POST',
          body: JSON.stringify({ direzione })
        });
        await aggiornaListaPianificati();
      } catch (e) {
        console.error('Spostamento non riuscito', e);
      }
    }

    async function eliminaPianificato(id) {
      try {
        await fai(`/sessioni/${sessioneId}/pianificati/${id}`, { method: 'DELETE' });
        await aggiornaListaPianificati();
      } catch (e) {
        console.error('Eliminazione non riuscita', e);
      }
    }

    async function lanciaRoundSuccessivo() {
      try {
        await fai(`/sessioni/${sessioneId}/lancia-prossimo`, { method: 'POST' });
        await aggiornaListaPianificati();
      } catch (e) {
        alert('Nessun round pianificato da lanciare');
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
      mostraRoundAttivo(messaggio.round);
    }

    if (messaggio.tipo === 'aggiornamento-voti') {
      disegnaRisultati(messaggio.conteggio);
    }

    if (messaggio.tipo === 'round-chiuso') {
      disegnaRisultati(messaggio.conteggio);
      fermaTimer();
      pannelloRound.classList.add('nascosta');
      dueColonne.classList.remove('nascosta');
    }
  };
}

function mostraRoundAttivo(round) {
  dueColonne.classList.add('nascosta');
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
          opzioni: calcolaOpzioni(inputTipoRoundVeloce, inputOpzioniCustomVeloce),
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
btnNuovaSessione.addEventListener('click', () => mostraSchermata(schermataCrea));
btnAnnullaCrea.addEventListener('click', () => mostraSchermata(schermataLista));
btnAvviaRound.addEventListener('click', avviaRound);
btnChiudiRound.addEventListener('click', chiudiRound);
btnStorico.addEventListener('click', mostraStorico);
btnPianifica.addEventListener('click', pianificaRound);
btnRoundSuccessivo.addEventListener('click', lanciaRoundSuccessivo);
inputTipoRoundPianifica.addEventListener('change', () => {
  inputOpzioniCustomPianifica.classList.toggle('nascosta', inputTipoRoundPianifica.value !== 'custom');
});
inputTipoRoundVeloce.addEventListener('change', () => {
  inputOpzioniCustomVeloce.classList.toggle('nascosta', inputTipoRoundVeloce.value !== 'custom');
});
btnProietta.addEventListener('click', apriProiezione);
btnChiudiProiezione.addEventListener('click', chiudiProiezione);
btnTornaLista.addEventListener('click', async () => {
  if (ws) ws.close();
  await mostraElencoSessioni();
});
btnChiudiSessione.addEventListener('click', chiudiSessioneConConferma);