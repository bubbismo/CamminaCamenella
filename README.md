# CamminaCamenella

App allegra e rossa per registrare camminate e corse: GPS, distanza, dislivello, storico. Tutti i dati restano sul telefono: niente account, niente server, niente costi.

Esiste in due versioni che condividono lo stesso codice:

- **Web app (PWA)** per iPhone e Android: si apre da un link e si aggiunge alla schermata Home.
- **App Android (APK)**: tracciamento GPS anche con lo schermo spento.

> Progetto in costruzione. Fatto: registrazione, storico, mappa, dislivello preciso, calorie, fatica percepita, grafici. Avatar, icona e schermata iniziale. Backup ed esportazione GPX. Pausa automatica, parziali per km. In arrivo: annunci vocali, profilo altimetrico colorato, record personali, pianificazione del percorso.

## Usare la web app

Indirizzo: **https://bubbismo.github.io/CamminaCamenella/**

**iPhone (13 o successivo, iOS 16.4+, usa Safari):**
1. Apri l'indirizzo in Safari.
2. Tocca il pulsante Condividi (il quadrato con la freccia) → **Aggiungi a schermata Home**.
3. Apri CamminaCamenella dall'icona e, al primo Start, concedi la posizione ("Consenti").

**Android (Chrome):** apri l'indirizzo → menu ⋮ → **Installa app** (o "Aggiungi a schermata Home") e concedi la posizione.

### Limiti da conoscere
- Un sito **non può usare il GPS con lo schermo spento**. Durante la corsa lo schermo resta acceso (nero, per risparmiare batteria) e non bisogna cambiare app. Se la corsa viene interrotta, alla riapertura l'app chiede se riprenderla: il tratto senza GPS è collegato con una linea dritta e segnato come *stimato*.
- Lo schermo sempre acceso consuma più batteria.
- Per non fermare la corsa per sbaglio in tasca, Pausa e Stop si attivano **tenendo premuto** (1 e 2 secondi).
- I dati sono nel browser: se pulisci i dati di Safari/Chrome si perdono. Fai ogni tanto un **backup** (⚙️ Impostazioni → *Salva backup*): è un file da tenere su File/Drive o da mandarti per email, e con *Ripristina* le camminate tornano (anche su un altro telefono).
- La stima del dislivello è approssimativa (altitudine GPS smussata).

## Avatar
Al primo avvio l'app propone di creare un avatar (capelli, occhiali, barba, occhi, bocca, vestiti, colori, sfondo, più "Sorprendimi"). Si disegna **sul telefono** con [DiceBear](https://www.dicebear.com) e lo stile *Avataaars* di Pablo Stanley (uso libero, personale e commerciale): nessuna foto e nessun servizio esterno. Si modifica da ⚙️ Impostazioni o toccando l'avatar nella Home.

## Pausa automatica
Quando ti fermi (semaforo, foto, panorama) per almeno 10 secondi, sullo schermo compare **IN PAUSA** e il cronometro si ferma da solo; riparte dopo circa 5 secondi di cammino. Velocità media, passo e calorie contano solo il tempo in movimento; nel dettaglio trovi sia il tempo trascorso sia quello in movimento. Si regola (o si spegne) in ⚙️ Impostazioni: *Sensibile* (1 km/h), *Normale* (1,5 km/h), *Corsa* (3 km/h). Il calcolo usa i punti GPS salvati e, quando il telefono la fornisce, la velocità misurata dal GPS: si può sempre ricalcolare.

## Parziali per km
Nel dettaglio di ogni camminata, la tabella *Parziali per km* mostra per ogni chilometro il passo (senza soste e pause), una barra (più lunga = più veloce) e il dislivello del km, preso dalla stessa curva di quota corretta del dislivello totale. Il km più veloce (🐇) e il più lento (🐢) sono evidenziati; l'ultimo tratto incompleto mostra il passo equivalente. Il momento in cui si passa ogni km è interpolato tra i punti GPS.

## Statistiche
📊 *Statistiche* nella Home: distanza, calorie, numero di camminate, tempo e dislivello degli ultimi 7 giorni, 30 giorni o 12 mesi, con il confronto col periodo precedente e i grafici a barre di km e calorie (tocca una barra per il valore).

## Backup ed esportazione GPX
- **Backup** (⚙️ Impostazioni): un file JSON con tutte le camminate (punti GPS grezzi compresi), percorsi ripetuti, peso, nome, avatar e impostazioni. Il ripristino aggiunge solo le camminate che mancano e non cancella nulla.
- **GPX** (dettaglio di una camminata): per aprire il percorso in altre app (Komoot, Strava, OsmAnd, Google Earth…).
Su iPhone e Android si apre il foglio di condivisione (Salva su File, Drive, email, WhatsApp…).

## Dislivello preciso (senza barometro)
Il GPS sbaglia la quota di 10-20 m e, sommando il rumore, gonfia il dislivello. CamminaCamenella lo corregge in più modi (modulo `src/core/altimetria/`, comune a web e Android):
1. **Filtro e isteresi** (sempre, sul telefono): i punti si pesano per la precisione dichiarata dal GPS, si fondono con un filtro di Kalman e si contano solo le variazioni oltre una soglia (3 m, configurabile).
2. **Modello del terreno** (opzionale, *Impostazioni → Correggi la quota con la rete*, spento di default): a fine corsa si scaricano le quote del terreno e si fondono con quelle del GPS. Usa le tessere pubbliche *Terrain Tiles* su AWS: il telefono scarica alcune tessere (~2 km ciascuna) e legge le quote da sé, quindi i tuoi punti non partono. Riserva: Open-Meteo (qui partono le coordinate dei punti ricampionati ogni 25 m).
3. **Percorsi ripetuti** (sul telefono): se una corsa ricalca un percorso già fatto, il dislivello si stabilizza con il profilo medio delle uscite precedenti.
Nel dettaglio della corsa si vede da dove viene il dislivello. I dati GPS grezzi non vengono mai modificati, quindi si può ricalcolare. È sempre una **stima**. Non ancora fatto: aggancio dei punti al sentiero OSM (map matching).

Test: `npm test` (tracce GPS rumorose simulate).

## App Android (APK)
Scarica `CamminaCamenella-*.apk` dalla sezione Releases, consenti "Installa app sconosciute", installa e scegli la posizione "Consenti sempre". Disattiva le ottimizzazioni batteria per l'app.

## Compilare da zero
Servono Node 22+, e per l'APK anche Java 21 e l'Android SDK.
```bash
npm install
npx expo export -p web          # web app in dist/
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease   # APK in android/app/build/outputs/apk/release/
```
La web app si pubblica da sola su GitHub Pages a ogni push su `main` (`.github/workflows/pages.yml`).

## Organizzazione del codice
- `src/core/` logica comune senza dipendenze dalla piattaforma (calcoli, tipi, ciclo di una camminata).
- `src/archivio.native.ts` / `.web.ts`: salvataggio (SQLite / IndexedDB).
- `src/tracking.native.ts` / `.web.ts`: GPS (servizio in background / `geolocation` + wake lock).
- `src/screens/`, `src/ui.tsx`, `src/theme.ts`: interfaccia condivisa.

## Chiavi delle mappe
Le mappe base non richiedono chiavi. Eventuali chiavi (MapTiler, Thunderforest) vanno in `chiavi.local.json`, che non viene mai caricato su GitHub.
