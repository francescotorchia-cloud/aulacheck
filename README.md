# AulaCheck

Applicazione web di feedback anonimo in tempo reale per l'aula. Il docente lancia round a tempo su un argomento; gli studenti rispondono dal telefono (via codice o QR) finché il timer non scade; i risultati si aggiornano live e restano nello storico per confronto nel tempo.

Progetto sviluppato per l'esame di **Applicazioni Web, Mobile e Cloud** (Informatica per la Comunicazione Digitale, UNICAM).

## Indice

- [Funzionalità]
- [Stack tecnico](#stack-tecnico)
- [Architettura](#architettura)
- [Avvio rapido (Docker)](#avvio-rapido-docker)
- [Setup da zero (senza Docker)](#setup-da-zero-senza-docker)
- [Variabili d'ambiente](#variabili-dambiente)
- [API](#api)
- [Struttura del progetto](#struttura-del-progetto)
- [Scelte di scope dichiarate](#scelte-di-scope-dichiarate)

## Funzionalità

- **Autenticazione docente**: registrazione e login con email/password (bcrypt), sessione gestita via JWT
- **Multi-docente**: ogni docente registrato vede e gestisce solo le proprie sessioni
- **Creazione sessione**: il docente crea una sessione (lezione) con titolo; ottiene un codice a 6 caratteri e un QR code per l'accesso studenti
- **Accesso studente anonimo**: lo studente entra digitando il codice o scansionando il QR, senza registrazione
- **Round a tempo**: il docente avvia round con timer configurabile; gli studenti votano finché il timer non scade (autorevole lato server)
- **Voto libero**: lo studente può cambiare voto liberamente durante il round; vale sempre l'ultimo
- **Opzioni configurabili per round**: ogni round può usare comprensione (confuso/ok/perso), dibattito (squadra A/squadra B/neutro), vero/falso, o opzioni personalizzate — indipendentemente dal tipo scelto per gli altri round della stessa sessione
- **Pianificazione round**: il docente prepara in anticipo una sequenza di round con etichette e durate, poi li lancia in ordine con un click ("Round successivo")
- **Risultati in tempo reale**: la dashboard docente mostra i risultati aggiornarsi live via WebSocket, senza refresh
- **Modalità proiezione**: vista a schermo intero con QR e codice ingranditi, pensata per essere proiettata in aula
- **Analisi e storico**: per ogni sessione, statistiche aggregate (round totali, voti raccolti, percentuale media di comprensione) e il dettaglio di ogni round chiuso con relative percentuali
- **Persistenza**: tutti i dati (sessioni, round, voti) sono salvati su PostgreSQL e sopravvivono al riavvio del servizio

## Stack tecnico

- **Backend**: Node.js 24 (LTS), Express 5
- **Real-time**: WebSocket (libreria `ws`)
- **Database**: PostgreSQL 16 (containerizzato)
- **Autenticazione**: JWT (`jsonwebtoken`), password hashing con `bcrypt`
- **Frontend**: HTML/CSS/JavaScript vanilla (nessun framework), Single Page Application
- **Containerizzazione**: Docker, Docker Compose
- **QR code**: libreria `qrcode` (client-side)


## Architettura

Architettura a tre livelli (Presentation / Service / Persistence). Diagramma dettagliato in [`diagrams/architettura.md`](diagrams/architettura.md).

- **Presentation**: pagine HTML/JS servite come file statici da Express (`frontend/`)
- **Service**: route REST (`backend/index.js`), logica di dominio (`backend/src/state.js`), WebSocket (`backend/src/ws.js`)
- **Persistence**: PostgreSQL, accesso tramite query parametrizzate (`backend/src/db.js`)

Per il deploy e la containerizzazione, vedi [`diagrams/deploy.md`](diagrams/deploy.md).

## Avvio rapido (Docker)

Il modo più semplice per avviare l'intero progetto, con backend e database già configurati.

**Prerequisiti**: Docker Desktop installato e avviato.

```bash
git clone https://github.com/francescotorchia-cloud/aulacheck.git
cd aulacheck
```

Crea il file `backend/.env` (vedi [Variabili d'ambiente](#variabili-dambiente) per i dettagli):

```
PORT=3000
JWT_SECRET=una-stringa-lunga-e-casuale
DATABASE_URL=postgres://aulacheck:aulacheck_dev@postgres:5432/aulacheck
```

Avvia tutto:

```bash
docker compose up --build
```

Applica lo schema del database (solo la prima volta):

```bash
docker exec -i aulacheck-postgres-1 psql -U aulacheck -d aulacheck < backend/src/schema.sql
```

> Su Windows PowerShell, il comando sopra va sostituito con:
> ```powershell
> Get-Content backend\src\schema.sql | docker exec -i aulacheck-postgres-1 psql -U aulacheck -d aulacheck
> ```

L'applicazione è ora raggiungibile su `http://localhost:3000`.

## Setup da zero (senza Docker)

**Prerequisiti**: Node.js 24 (LTS), PostgreSQL 16 installato localmente, Git.

```bash
git clone https://github.com/francescotorchia-cloud/aulacheck.git
cd aulacheck/backend
npm install
```

Crea il database PostgreSQL:

```bash
createdb aulacheck
```

Applica lo schema:

```bash
psql -U postgres -d aulacheck -f src/schema.sql
```

Crea il file `backend/.env`:

```
PORT=3000
JWT_SECRET=una-stringa-lunga-e-casuale
DATABASE_URL=postgres://postgres:password@localhost:5432/aulacheck
```

Avvia il backend:

```bash
node index.js
```

L'applicazione è raggiungibile su `http://localhost:3000`.
> **Nota**: il metodo Docker (sezione precedente) è quello verificato concretamente durante lo sviluppo. Questa via alternativa segue la stessa logica dello stack dichiarato ma non è stata testata end-to-end in questa sessione di sviluppo.

## Variabili d'ambiente

Il backend richiede un file `backend/.env` (mai committato — è escluso via `.gitignore`) con queste variabili:

| Variabile | Descrizione | Esempio |
|---|---|---|
| `PORT` | Porta su cui il server Express ascolta | `3000` |
| `JWT_SECRET` | Chiave segreta per firmare i token JWT — deve essere una stringa lunga e casuale | `una-stringa-lunga-e-casuale-a-caso` |
| `DATABASE_URL` | Stringa di connessione PostgreSQL | `postgres://aulacheck:aulacheck_dev@postgres:5432/aulacheck` (Docker) o `postgres://utente:password@localhost:5432/aulacheck` (locale) |

Le credenziali del docente non sono più configurate tramite variabili d'ambiente: ogni docente si registra autonomamente dall'interfaccia (vedi [Funzionalità](#funzionalità)).

## API

Tutte le route restituiscono JSON. Le route contrassegnate con "Auth" richiedono un header `Authorization: Bearer <token>` (ottenuto da `/login` o `/registrazione`).

| Metodo | Endpoint | Auth | Descrizione |
|---|---|---|---|
| POST | `/registrazione` | No | Crea un nuovo account docente |
| POST | `/login` | No | Autentica un docente esistente |
| POST | `/sessioni` | Sì | Crea una nuova sessione |
| GET | `/sessioni` | Sì | Elenca le sessioni del docente autenticato |
| GET | `/sessioni/:id` | No | Restituisce lo stato di una sessione (usata dallo studente) |
| GET | `/sessioni/:id/apri` | Sì | Apre una sessione esistente, resettando i round pianificati già lanciati |
| GET | `/sessioni/codice/:codice` | No | Cerca una sessione per codice a 6 caratteri |
| DELETE | `/sessioni/:id` | Sì | Elimina definitivamente una sessione |
| POST | `/sessioni/:id/chiudi` | Sì | Chiude definitivamente una sessione |
| POST | `/sessioni/:id/round` | Sì | Avvia un round (opzionalmente con opzioni personalizzate) |
| POST | `/sessioni/:id/round/chiudi` | Sì | Chiude manualmente il round attivo |
| POST | `/sessioni/:id/voto` | No | Registra il voto di uno studente (anonima) |
| POST | `/sessioni/:id/pianifica` | Sì | Aggiunge un round alla lista pianificata |
| GET | `/sessioni/:id/pianificati` | Sì | Elenca i round pianificati |
| DELETE | `/sessioni/:id/pianificati/:pianificatoId` | Sì | Elimina un round pianificato non ancora lanciato |
| POST | `/sessioni/:id/pianificati/:pianificatoId/sposta` | Sì | Sposta un round pianificato su/giù nell'ordine |
| POST | `/sessioni/:id/lancia-prossimo` | Sì | Lancia il prossimo round pianificato in ordine |
| GET | `/sessioni/:id/storico` | Sì | Restituisce i round chiusi di una sessione |
| GET | `/sessioni/:id/analisi` | Sì | Restituisce statistiche aggregate e storico di una sessione |

Comunicazione in tempo reale via WebSocket sullo stesso host/porta: il client si iscrive a una sessione inviando `{ "tipo": "iscriviti", "sessioneId": "..." }`, e riceve broadcast di tipo `round-avviato`, `aggiornamento-voti`, `round-chiuso`.


## Struttura del progetto

```
aulacheck/
├── backend/
│   ├── src/
│   │   ├── state.js       # logica di dominio (sessioni, round, voti, pianificazione)
│   │   ├── db.js          # connessione PostgreSQL
│   │   ├── ws.js          # server WebSocket e broadcast
│   │   └── schema.sql     # schema del database
│   ├── index.js           # route Express, avvio server
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
├── frontend/
│   ├── index.html          # pagina indice (scelta studente/docente)
│   ├── studente.html/js    # interfaccia studente
│   ├── docente.html/js     # interfaccia docente
│   └── stile.css, stile-docente.css
├── diagrams/
│   ├── architettura.md
│   └── deploy.md
├── docker-compose.yml
└── README.md
```



## Scelte di scope dichiarate

Alcune scelte tecniche sono state fatte consapevolmente per restare nei tempi di un progetto di poche settimane, sviluppato da un solo studente. Sono elencate qui esplicitamente, non nascoste.

- **Nessun orchestratore container avanzato**: niente Kubernetes, autoscaling, o load balancer. Il progetto è dimensionato per un'aula singola (20-40 connessioni WebSocket attese); un servizio containerizzato singolo con Docker Compose è sufficiente e proporzionato. I concetti restano comunque materia d'esame nota e discutibile a voce.
- **Nessun test automatizzato**: le funzionalità sono state verificate manualmente durante lo sviluppo (baseline incrementali testate una a una), ma non esiste una suite di unit test. La pipeline CI/CD esegue comunque build e verifica di avvio (vedi `.github/workflows/`).
- **Logica di dominio non separata per modulo**: `state.js` contiene tutte le funzioni di dominio (sessioni, round, voti, pianificazione) in un unico file, anziché moduli separati per tipo di round. Estendere il sistema (es. aggiungere una modalità Quiz) richiede modificare questo file, non è isolato in un modulo indipendente.
- **Registrazione docente aperta, senza verifica dell'identità**: chiunque può registrarsi come docente, senza conferma email o approvazione. Accettabile per lo scope del progetto (nessun dato sensibile in gioco, nessuna azione irreversibile su terzi); un sistema in produzione con utenti reali richiederebbe un meccanismo di verifica.
- **Confronto tra sessioni diverse non implementato**: l'analisi mostra statistiche aggregate per singola sessione; un confronto storico tra più sessioni nel tempo (per vedere se un argomento resta problematico su più lezioni) è uno sviluppo naturale non ancora realizzato.
- **Nessun test di carico reale**: le 20-40 connessioni WebSocket simultanee attese in un'aula non sono state testate con carico reale, solo con poche connessioni durante lo sviluppo.