# CamminaCamenella

App allegra e rossa per registrare camminate e corse: GPS, distanza, dislivello, storico. Tutti i dati restano sul telefono: niente account, niente server, niente costi.

Esiste in due versioni che condividono lo stesso codice:

- **Web app (PWA)** per iPhone e Android: si apre da un link e si aggiunge alla schermata Home.
- **App Android (APK)**: tracciamento GPS anche con lo schermo spento.

> Progetto in costruzione. Fatto: registrazione e storico. In arrivo: mappa, calorie, fatica percepita, avatar, esportazione GPX, pianificazione del percorso.

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
- I dati sono nel browser: se pulisci i dati di Safari/Chrome si perdono. (Una funzione di backup arriverà.)
- La stima del dislivello è approssimativa (altitudine GPS smussata).

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
