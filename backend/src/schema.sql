CREATE TABLE IF NOT EXISTS sessioni (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  titolo TEXT NOT NULL,
  codice TEXT UNIQUE NOT NULL,
  chiusa BOOLEAN NOT NULL DEFAULT false,
  creata_il TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS round (
  id TEXT PRIMARY KEY,
  sessione_id TEXT NOT NULL REFERENCES sessioni(id),
  etichetta TEXT,
  opzioni JSONB NOT NULL,
  durata_secondi INTEGER NOT NULL,
  iniziato_il TIMESTAMPTZ NOT NULL,
  terminato_il TIMESTAMPTZ,
  stato TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS voti (
  round_id TEXT NOT NULL REFERENCES round(id),
  client_id TEXT NOT NULL,
  valore TEXT NOT NULL,
  aggiornato_il TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (round_id, client_id)
);

CREATE TABLE IF NOT EXISTS round_pianificati (
  id TEXT PRIMARY KEY,
  sessione_id TEXT NOT NULL REFERENCES sessioni(id),
  etichetta TEXT,
  opzioni JSONB,
  ordine INTEGER NOT NULL,
  lanciato BOOLEAN NOT NULL DEFAULT false
);