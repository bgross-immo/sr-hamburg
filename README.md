# Schattennetz Hamburg

Privater Kampagnen-Hub der Hamburg-Runde (Shadowrun). Node/Express + SQLite + EJS.
Bereiche: Runner, Logbuch (Runs mit Bildern), Zeitleiste, Kontakte, Spieler-Notizen, SL-/HDL-Bereich.
Komplett login-geschuetzt; pro Spieler ein Login. Benjamin & Alex sind SL.

## Lokal starten
```
cp .env.example .env        # Werte anpassen
npm install
npm start                   # http://localhost:3000
```
Beim ersten Start werden Daten geseedet. Default-Passwort = `SEED_DEFAULT_PASSWORD` aus der .env.
Logins (Benutzername): benjamin, alex (SL) · patric, sigi, max, moritz (Spieler).
Jeder muss beim ersten Login das Passwort aendern.

## Deploy auf Coolify (Domain: sr-hamburg.benjamin-gross.de)
1. Repo zu GitHub pushen (ohne node_modules / data).
2. Coolify → New Resource → Application → Source: dein GitHub-Repo. Build Pack: **Dockerfile**.
3. Environment Variables setzen:
   - `SESSION_SECRET` = langer Zufallswert
   - `SEED_DEFAULT_PASSWORD` = Start-Passwort fuer alle Logins
   - `PORT` = 3000 (Default)
4. **Persistent Storage**: Volume mounten auf `/app/data` (haelt Datenbank + hochgeladene Bilder ueber Deploys hinweg).
5. Domain: `sr-hamburg.benjamin-gross.de`, Port `3000`, HTTPS aktivieren.
6. Deploy. Danach mit den Logins oben anmelden und Passwoerter aendern.

## Hinweise
- Spielersicht ist spoilerfrei; der Metaplot steht nur im SL-Bereich (Codename „HDL").
- SL kann Runs/Kontakte bearbeiten und Bilder hochladen (Buttons erscheinen nur fuer SL).
- Sessions liegen im Speicher (Neustart = neu einloggen). Fuer geteilte Persistenz spaeter ein Session-Store ergaenzbar.
