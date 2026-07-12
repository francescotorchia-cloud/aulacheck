# Architettura di AulaCheck

Architettura a tre livelli (Presentation / Service / Persistence), con canale WebSocket parallelo per gli aggiornamenti in tempo reale.

```mermaid
graph TB
    subgraph Presentation["Presentation Layer"]
        Studente["Pagina Studente<br/>(studente.html/js)"]
        Docente["Dashboard Docente<br/>(docente.html/js)"]
    end

    subgraph Service["Service Layer"]
        Express["Express.js<br/>(index.js — route REST)"]
        WS["WebSocket Server<br/>(ws.js — broadcast live)"]
        State["Logica di dominio<br/>(state.js)"]
        Auth["Middleware JWT<br/>(richiedeAuth)"]
    end

    subgraph Persistence["Persistence Layer"]
        Postgres[("PostgreSQL<br/>sessioni · round · voti · round_pianificati · docenti")]
    end

    Studente -- "REST (fetch)" --> Express
    Studente -- "WebSocket" --> WS
    Docente -- "REST (fetch)" --> Express
    Docente -- "WebSocket" --> WS

    Express --> Auth
    Auth --> State
    Express --> State
    WS --> State

    State --> Postgres
```

## Note architetturali

- **SPA (Single Page Application)**: ogni pagina (`studente.html`, `docente.html`) è un'unica pagina HTML; JavaScript aggiorna il DOM dinamicamente senza mai ricaricare.
- **Separazione delle responsabilità**: il livello di presentazione non contiene logica di business; comunica solo via REST/WebSocket con il backend.
- **Stato in memoria**: solo i timer dei round (`setTimeout`) vivono in memoria nel processo Node — sono comportamento a runtime, non dati persistenti. Tutto il resto (sessioni, round, voti) vive in PostgreSQL.