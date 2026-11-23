# The 100 Hours Project

Sezione statica del sito (GitHub Pages): HTML + CSS + JavaScript (ES modules), senza build e senza dipendenze da installare.

## Struttura

```
100hourschallenge/
├── index.html              entry point (routing via hash: #/ e #/challenge/<id>)
├── css/style.css           design system (token colori, componenti, responsive)
├── js/
│   ├── main.js             router, azioni, witch mode, export
│   ├── store.js            caricamento JSON, bozza locale, export zip
│   ├── images.js           foto in IndexedDB + compressione (max 1600px)
│   ├── model.js            calcoli: ore, milestone, statistiche, confronto
│   ├── forms.js            form con validazione (challenge, sessioni, diario…)
│   ├── charts.js           grafici SVG del confronto
│   ├── sprite.js           tutte le illustrazioni SVG originali
│   ├── messages.js         frasi del fantasmino
│   ├── achievements.js     achievement globali
│   └── views/              dashboard e pagina singola challenge
├── data/challenges.json    TUTTI i contenuti (l'unico file che cambia)
├── uploads/                foto caricate (create dall'export)
└── assets/favicon.svg
```

## Come si aggiornano i contenuti

Il sito è statico, quindi non può scrivere su GitHub da solo. Il flusso è:

1. Apri `https://<tuo-utente>.github.io/<percorso>/100hourschallenge/#/witch` per attivare la **witch mode** (modalità modifica, ricordata nel browser). I visitatori normali vedono il sito in sola lettura.
2. Crea/modifica challenge, registra ore, scrivi nel diario, carica foto. Tutto viene salvato **in questo browser** (localStorage + IndexedDB per le foto), quindi ricaricare la pagina non fa perdere nulla.
3. Clicca **Export & publish** nella barra viola in alto: scarica uno zip con `data/challenges.json` e le nuove foto in `uploads/`.
4. Scompatta lo zip dentro la cartella `100hourschallenge` del repo (sovrascrivi il JSON), poi commit & push (o carica i file dall'interfaccia web di GitHub).
5. Quando GitHub Pages ha finito di pubblicare, ricarica la pagina: la bozza locale si cancella da sola perché coincide con la versione online.

Note:
- **Discard** butta via le modifiche locali e torna alla versione pubblicata.
- Se modifichi da due dispositivi diversi, la barra ti avvisa quando i dati online sono più recenti della tua bozza.
- Le modifiche fatte in un browser restano in quel browser finché non le esporti.

## Provarlo in locale

I browser bloccano il caricamento del JSON da `file://`, quindi serve un mini server:

```sh
cd 100hourschallenge
python3 -m http.server 8000
```

e poi apri `http://localhost:8000/#/witch`.

## Integrazione nel sito

Copia la cartella `100hourschallenge` nella root del repo GitHub Pages: sarà raggiungibile su `/100hourschallenge/`. Tutti i percorsi sono relativi, quindi funziona in qualunque sottocartella. Per linkarla dal resto del sito basta un normale `<a href="100hourschallenge/">`.
