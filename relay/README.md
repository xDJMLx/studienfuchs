# Relais für die kostenlose KI (ohne Anmeldung)

Die KI im Chat soll sofort funktionieren, ohne dass sich jemand anmeldet. Dafür nutzt die App die Gratis-Modelle von
[Kilo](https://kilo.ai/docs/gateway/authentication#anonymous-access) (offiziell anonym erlaubt, 200 Anfragen pro Stunde und Internetadresse).
Kilo blockiert Aufrufe direkt aus dem Browser (CORS). Darum braucht die Seite ein winziges Relais, das die Frage weiterreicht.
`kilo-relay.js` ist dieses Relais (ein Cloudflare Worker, kostenlos, speichert nichts, braucht keinen geheimen Schlüssel).

## Einrichtung (einmalig, etwa 5 Minuten)

1. Auf <https://dash.cloudflare.com/sign-up> ein kostenloses Konto anlegen (E-Mail genügt, keine Kreditkarte).
2. Im Dashboard links **Workers & Pages** öffnen, **Create** wählen und **Start with Hello World!**.
   Als Name z. B. `studienfuchs-ki` eintragen und **Deploy** drücken.
3. Dann **Edit code** wählen, den ganzen vorhandenen Code löschen, den kompletten Inhalt von `relay/kilo-relay.js` einfügen
   und oben rechts **Deploy** drücken.
4. Die Adresse des Workers kopieren (sieht aus wie `https://studienfuchs-ki.DEINNAME.workers.dev`).
5. Die Adresse in `src/lib/freeAi.ts` bei `DEFAULT_FREE_AI_URL` eintragen und die Seite neu veröffentlichen.
   Ohne Adresse bleibt die kostenlose Stufe aus, und die App nutzt wie bisher Puter.

## Wie es funktioniert

- Das Relais lässt nur Anfragen von `https://xdjmlx.github.io` (und lokal `localhost`) zu.
- Es probiert die Gratis-Modelle der Reihe nach (`MODELS`), bis eines antwortet. Ist alles ausgelastet, antwortet es mit 429/503,
  und die App bietet dann einen anderen Anbieter an (Puter, kostenlose Anmeldung).
- Die Antwort enthält nur den Text, kein verstecktes „Nachdenken“ der Modelle.
- Kilo zählt die 200 Anfragen pro Stunde pro Internetadresse. Über das Relais teilen sich alle Nutzer wenige Adressen,
  bei vielen gleichzeitigen Nutzern kommt deshalb öfter „ausgelastet“.

## Lokal testen

```bash
node relay/relay-dev.mjs   # startet das Relais auf Port 8787
echo VITE_FREE_AI_URL=http://localhost:8787 > .env.local
npm run dev
```

---

---

# Postfach für Fehlerberichte und Rückmeldungen

Mit `feedback-worker.js` landen „Fehler melden“, Ideen und (nur wenn jemand es einschaltet) anonyme Nutzungszähler direkt bei dir,
und du kannst sie jederzeit abrufen. Ohne diese Adresse öffnet „Senden“ in der App das Teilen-Fenster des Geräts (z. B. WhatsApp).

1. Im Cloudflare-Dashboard **Workers & Pages → Create → Hello World** (Name z. B. `studienfuchs-feedback`), **Deploy**, dann **Edit code**,
   den Inhalt von `relay/feedback-worker.js` einfügen, **Deploy**.
2. Im Worker unter **Settings → Bindings → Add → KV namespace**: einen neuen Namespace anlegen (z. B. `studienfuchs-feedback`) und mit dem
   Variablennamen **`FEEDBACK`** verbinden.
3. Unter **Settings → Variables and Secrets → Add** ein Geheimnis **`READ_KEY`** anlegen (ein langes zufälliges Passwort, nur für dich).
4. Die Adresse des Workers in `src/lib/feedback.ts` bei `DEFAULT_FEEDBACK_URL` eintragen und die Seite neu veröffentlichen.
5. Lesen: `https://DEIN-WORKER.workers.dev/?key=DEIN_LESESCHLÜSSEL` im Browser oder per `curl` aufrufen (JSON, neueste zuerst).

Was gespeichert wird: Art, Nachricht, Version, Seite, Gerätetyp, Fenstergröße, Sprache, die letzten Fehlermeldungen, Zähler
(z. B. wie viele Runden) und eine zufällige Kennung ohne Namen. Nie Lerninhalte. Alles wird nach 120 Tagen gelöscht.
