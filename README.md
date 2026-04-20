# HR Koordinator

HR Koordinator ist eine webbasierte HR- und Operations-Plattform fuer Unternehmen, die Personalverwaltung, Tagesgeschaeft und interne Prozesse nicht mehr ueber verteilte Einzeltools organisieren wollen. Die Anwendung verbindet Personalakte, Zeiterfassung, Abwesenheiten, Lernen, Benefits, Organigramm, Teamverwaltung, Workflows und betriebliche Zusatzmodule in einer gemeinsamen Oberflaeche.

Wichtiger Hinweis zur Benennung: Im Code tauchen noch historische Namen wie `HRthis` und `BrowoKo_*` auf. Gemeint ist dasselbe Produkt. Fuer Aussenstehende ist `HR Koordinator` die richtige Produktbezeichnung.

## Kurzueberblick

- Ziel: HR-, Teamlead- und Admin-Prozesse in einer Plattform buendeln
- Nutzerrollen: `USER`, `TEAMLEAD`, `HR`, `ADMIN`, `SUPERADMIN`, `EXTERN`
- Architektur: React/Vite im Frontend, Supabase fuer Auth, Datenbank, Storage und Edge Functions
- Mandantenmodell: Single-Tenant, also eine Firma pro Datenbank/Projekt
- Oberflaechen: Mitarbeiterbereich, Admin-Bereich, spezialisierte Screens fuer Lernen, Assets, Workflows und Monitoring

## Kontext

Viele mittelstaendische oder operativ gepragte Unternehmen arbeiten im Alltag mit einem Mix aus Tabellen, Chatnachrichten, PDF-Ordnern, E-Mail-Freigaben und mehreren SaaS-Tools. Dadurch entstehen typische Probleme:

- Personaldaten liegen verteilt und sind nicht konsistent
- Urlaubs- und Abwesenheitsprozesse laufen ueber Nachrichten, Zurufe oder manuelle Listen
- Lerninhalte, Tests und internes Wissen sind schwer auffindbar
- Benefits, Dokumente und Mitarbeitergespraeche haben keinen gemeinsamen Prozess
- Organisationsstruktur, Teams, Positionen und Verantwortlichkeiten sind nicht transparent
- Wiederkehrende HR-Prozesse wie Onboarding oder Erinnerungen werden manuell angestossen
- Admins sehen zu spaet, wenn Schnittstellen oder Backend-Funktionen ausfallen

## Problem

Ohne eine integrierte HR-Oberflaeche entsteht hoher Koordinationsaufwand:

- Daten muessen mehrfach gepflegt werden
- Verantwortlichkeiten sind unklar
- Freigaben dauern lange
- Wissen geht verloren
- Skalierung ueber mehrere Teams, Standorte und Rollen wird unuebersichtlich

## Loesung

HR Koordinator loest dieses Problem als operative Plattform:

- Eine gemeinsame Authentifizierung und Rollenlogik fuer alle HR-Module
- Eine zentrale Mitarbeiterdatenbasis
- Konkrete Alltagsmodule fuer Zeiterfassung, Abwesenheiten, Dokumente, Lernen und Benefits
- Admin-Werkzeuge fuer Teamaufbau, Organigramm, Positionen, Workflows und Systembetrieb
- Edge-Function-basierte Backend-Module, die einzelne Fachbereiche sauber trennen

## Fuer wen ist das Tool gedacht?

### Mitarbeitende

Mitarbeitende nutzen HR Koordinator fuer ihren persoenlichen Alltag:

- Dashboard mit Urlaubsstand, XP, Coins, Aufgaben und Unternehmensinfos
- Eigene Personalakte und Dokumente
- Zeiterfassung und Abwesenheitsantraege
- Lernzentrum mit Videos, Tests, Wiki und Fortschritt
- Benefits-Anfragen und persoenliche Gesprache

### Teamleads

Teamleads bekommen zusaetzlich operative Steuerung:

- Teambezogene Abwesenheiten und Freigaben
- Einsicht in Teamstrukturen
- Mitarbeitende anlegen oder pflegen, je nach Berechtigung
- Nutzung von Prioritaeten, Teamtags und Teamkalendern

### HR / Admin / Superadmin

Die Admin-Seite richtet sich an Personen, die Prozesse und Strukturen gestalten:

- Mitarbeiter-, Team- und Positionsverwaltung
- Organigramm und Unternehmensstruktur
- Benefits, Lerninhalte, Tests und Dashboard-Mitteilungen
- Mitarbeitergespraeche
- Automationen, Workflows und API-Keys
- System-Health, Storage-Diagnose und Betriebsfunktionen

### Externe Mitarbeitende

Die Rolle `EXTERN` bekommt eine reduzierte Navigation. Im aktuellen Code ist das bewusst begrenzt auf die fuer externe Arbeit relevanten Oberflaechen wie `Dashboard` und `Arbeit`.

## User Journey

### 1. Initiales Setup durch HR/Admin

Der Einstieg beginnt im Admin-Bereich:

1. Firmenbasis konfigurieren
2. Standorte, Abteilungen und Spezialisierungen anlegen
3. Teams, Positionen und Rollen definieren
4. Organigramm aufbauen und veroeffentlichen
5. Benefits, Lerninhalte, Tests und Templates vorbereiten
6. Optional Workflows, API-Keys und Monitoring aktivieren

### 2. Mitarbeitende anlegen und onboarden

Fuer neue Mitarbeitende gibt es einen mehrstufigen Wizard:

1. Basisdaten und Login-Daten erfassen
2. Arbeitsinformationen, Vertrag und Arbeitszeitmodell hinterlegen
3. Persoenliche Daten, Bank, Notfallkontakt und Groessen pflegen
4. Workflows fuer Onboarding oder Folgeprozesse zuweisen

### 3. Mitarbeiteralltag

Nach dem Login arbeiten Mitarbeitende ueber wenige Hauptbereiche:

1. `Dashboard` fuer persoenliche Kennzahlen und Unternehmensupdates
2. `Arbeit` fuer Check-in/Check-out und Arbeitsarten
3. `Kalender` fuer Abwesenheiten, Teamverfuegbarkeit und Exporte
4. `Lernen` fuer Videos, Tests, Lerneinheiten und Wiki
5. `Benefits` fuer Anfragen, Einkaeufe und Rewards
6. `Meine Daten` fuer Personalakte, Dokumente, Logs und Gespraeche

### 4. Laufende Steuerung durch HR/Leads

HR und Fuehrungskraefte arbeiten parallel in den Admin-Modulen:

1. Mitarbeiterdaten korrigieren oder ergaenzen
2. Teamzuordnungen, Positionen und Berechtigungen pflegen
3. Benefits freigeben
4. Lernfortschritt, externe Schulungen und Testeinreichungen kontrollieren
5. Gesprache versenden und auswerten
6. Workflows, Mitteilungen und betriebliche Assets verwalten

## Feature-Katalog

Die folgenden Module sind im aktuellen Codebestand vorhanden.

### 1. Authentifizierung, Rollen und Zugriff

Die Plattform besitzt ein rollenbasiertes Zugriffssystem mit Frontend- und Backend-Kopplung.

Enthalten sind:

- Login, Registrierung, Passwort vergessen und Passwort-Reset
- Geschuetzte Routen fuer Mitarbeiterbereich und Admin-Bereich
- Rollen: `USER`, `TEAMLEAD`, `HR`, `ADMIN`, `SUPERADMIN`, `EXTERN`
- Zentrale Permission-Matrix mit Rechten wie `access_admin_area`, `approve_leave_requests`, `manage_workflows`, `manage_benefits`
- Rollenbasierte Navigation und eingeschraenkte Sicht fuer externe Nutzer

### 2. Dashboard

Das Dashboard ist die taegliche Startseite.

Es kombiniert:

- persoenlichen Begruessungsbereich mit Mitarbeiterdaten
- Quick Stats fuer Urlaubstage, Coins, XP und Aufgaben
- eine eingebettete Organigramm-Karte
- live geschaltete Dashboard-Mitteilungen
- Badge-basierte Navigationshinweise ueber das Notification-System

Die Dashboard-Mitteilungen koennen zusaetzlich Inhalte wie Videos oder Benefits referenzieren und dienen als interner Startseiten-Broadcast.

### 3. Benachrichtigungen

Ein eigenes Notification-System existiert ueber Store und Badge-Logik.

Enthalten sind:

- Seiten-Badges in der Hauptnavigation
- Initialisierung pro User
- Markierung als gelesen pro Bereich
- vorbereitete Realtime-/Migration-Integration

### 4. Meine Daten / Personalakte

Der Bereich `Meine Daten` ist die persoenliche Mitarbeiteransicht.

Er deckt mehrere Unterbereiche ab:

- Profilbild-Upload mit Zuschneiden
- persoenliche Stammdaten
- Adresse
- Bankdaten
- Konfektionsgroessen
- Notfallkontakte
- Sprachkenntnisse
- Beschaeftigungsinformationen
- eigene Logs
- eigene Berechtigungen
- eigene Antraege
- eigene Dokumente
- Mitarbeitergespraeche

Besonders wichtig:

- Card-Level-Editing verhindert paralleles Bearbeiten widerspruechlicher Formularbereiche
- Tabs werden dynamisch ueber Routing synchronisiert
- Felder werden ueber Berechtigungen gesteuert

### 5. Dokumentenmanagement

Das Dokumentenmodul ist direkt in `Meine Daten` und in Admin-Detailansichten eingebettet.

Funktionen:

- Dokumente durchsuchen
- nach Datum filtern
- nach Kategorien filtern
- Kategoriekarten mit Zaehlern
- Dokumente ansehen
- Dokumente herunterladen
- Liste aller Dokumente, zuletzt hinzugefuegte Dokumente und wichtige Dokumente

Im aktuellen Produktfluss stammen Dokumente typischerweise aus Admin-Uploads und Zuweisungen an einzelne Mitarbeitende.

### 6. Arbeit / Zeiterfassung

Der Screen `Arbeit` ist die operative Zeiterfassung.

Funktionen:

- Check-in und Check-out
- drei Arbeitsarten: `Office`, `Field`, `Extern`
- Live-Laufzeit waehrend einer aktiven Session
- Zeitaufzeichnungen mit Filter `heute`, `Woche`, `Monat`
- Summen fuer Stunden und Pausen
- Backend-Anbindung ueber die Edge Function `BrowoKoordinator-Zeiterfassung`

Die Zeiterfassung ist nicht nur ein UI-Stub, sondern ueber Hook und API-Endpunkte angebunden.

### 7. Kalender, Abwesenheiten und Exporte

Der Kalender ist eines der reicheren Mitarbeiter-Module.

Unterstuetzt werden:

- persoenliche Kalenderansicht
- Spezialisierungsansicht
- Teamansicht
- Standortansicht
- Firmenansicht
- Schichtansicht
- Urlaubs- und Abwesenheitsantraege direkt aus dem Kalender
- Detaildialoge fuer Tage mit vorhandenen Eintraegen
- Team-Abwesenheiten
- Schichtkalender
- Export als CSV
- Export als PDF
- Export als iCal

Der Kalender ist damit sowohl Mitarbeiteransicht als auch Team-/Standort-Planungssicht.

### 8. Team- und Mitarbeiterverwaltung

Die Admin-Hauptverwaltung fuer Personen, Teams und Stammdaten ist ein zentrales Kernmodul.

Funktionen:

- Mitarbeiterliste mit Filterung, Sortierung und gespeicherten Suchen
- Teamverwaltung
- Positionsverwaltung
- Export nach CSV und Excel
- Bulk Actions fuer mehrere Mitarbeitende
- Bulk Edit fuer Standort oder Abteilung
- Bulk Document Upload
- Quick Actions pro Person
- Quick Edit
- Quick Note
- schnelles Dokument hochladen
- Coins vergeben
- direkter Sprung in Detailansichten

Die Mitarbeiterverwaltung ist stark auf operative HR-Arbeit ausgelegt und geht deutlich ueber ein einfaches Nutzerverzeichnis hinaus.

### 9. Mitarbeiter-Anlage via Wizard

Neue Mitarbeitende koennen ueber einen vierstufigen Wizard angelegt werden.

Die Schritte sind:

1. Basisdaten
2. Arbeitsinformationen
3. Persoenliche Daten
4. Workflow-Zuweisung

Der Wizard validiert umfangreich, unter anderem:

- Pflichtdaten fuer Login und Person
- Arbeitszeitmodell
- Vertragsstatus
- Adress- und Bankdaten
- Notfallkontakte
- Sprachkenntnisse

### 10. Teammitglied-Detailansicht

Admin-Detailseiten fuer Mitarbeitende gehen tiefer als die Selbstansicht.

Verfuegbar sind:

- Personalakte aus Admin-Sicht
- Lernfortschritt
- Logs
- Gespraeche
- Berechtigungseditor
- Dokumente
- Profilbild-Upload fuer andere Nutzer
- Rollenwechsel

### 11. Teams, Rollen und Positionen

Neben einzelnen Personen existieren mehrere Strukturmodule:

- Teamanlage mit Leads und Mitgliedern
- Teambeschreibungen und Prioritaets-Tags
- Positionen mit Level, Status und Gehaltsbaendern
- Relation `berichtet an`
- Anzeige, wie viele Personen auf einer Position arbeiten
- Dialog fuer Mitarbeiter pro Position

Das hilft dabei, Organigramm, Stellenlogik und operative Personalplanung zusammenzuhalten.

### 12. Organigramm

Das Organigramm ist ein eigenes Kernsystem mit zwei Ebenen:

- veroeffentlichte Read-Only-Ansicht fuer Mitarbeitende
- editierbarer Admin-Canvas

Im Admin-Modul `Organigram Unified` sind enthalten:

- Canvas-Editor
- Sidebar fuer Firmendaten, Standorte und Abteilungen
- automatische Uebernahme vorhandener Standorte und Abteilungen in den Canvas
- Auto-Save
- Historie / Undo-Logik
- Draft-/Publish-Mechanik
- bi-direktionale Synchronisation zwischen Kartenverwaltung und Canvas

Die Mitarbeiteransicht zeigt ausschliesslich veroeffentlichte Knoten und Verbindungen.

### 13. Firmeneinstellungen

Das alte, aber weiterhin vorhandene Firmenmodul verwaltet Basisdaten des Unternehmens.

Funktionen:

- Firmenname und Domain
- Logo-Upload
- Standorte
- Abteilungen
- Spezialisierungen
- Storage-Diagnose

### 14. Lernen: Videos, Tests, Lerneinheiten, Wiki

Das Lernzentrum ist ein grosses Modul fuer internes Wissen und Weiterbildung.

Fuer Mitarbeitende umfasst es:

- Video-Lerninhalte mit Fortschritt
- Tests
- Lerneinheiten
- Wiki
- Avatar-Widget im Lernkontext
- Such- und Statusfilter wie `alle`, `angefangen`, `abgeschlossen`, `eingereicht`, `bestanden`

Das Wiki bietet bereits fortgeschrittene Filter:

- Volltextsuche
- Filter nach Abteilung
- Filter nach Standort
- Filter nach Spezialisierung
- erweiterte Filter fuer RAG-Typen, Zeichenanzahl, Storage, Erstell- und Aenderungszeitraeume

### 15. Lernverwaltung fuer Admins

Im Admin-Modul fuer Lernen werden Inhalte und Fortschritt zentral gepflegt.

Enthalten sind:

- Videoverwaltung mit Erstellen, Bearbeiten und Loeschen
- Testverwaltung
- Einreichungen und Test-Reviews
- Wiki-Artikel anlegen, bearbeiten, ansehen und loeschen
- Training-Compliance-Tabellen
- externe Schulungen
- eigener Avatar-Admin-Bereich per Lazy Load

### 16. Test Builder

Der Test Builder ist ein eigenes Autorenwerkzeug.

Er bietet:

- Drag-and-Drop-Oberflaeche
- Toolbox mit 10 Blocktypen
- Reihenfolgeverwaltung
- Block-Einstellungen
- Speichern und Veroeffentlichen
- Video-Verknuepfung fuer Test/Video-Zuweisungen

Unterstuetzte Blocktypen sind unter anderem:

- Single Choice
- Multiple Choice
- True/False
- kurze und lange Textantwort
- Datei-Upload
- Video-Embed
- Bildfrage
- Sortierung
- Lueckentext

### 17. Benefits

Das Benefits-Modul verbindet klassische Mitarbeiter-Benefits mit einer Coin-Oekonomie.

Fuer Mitarbeitende:

- Benefits durchsuchen
- Benefits nach Kategorie filtern
- Benefits anfragen
- Benefits mit Coins kaufen
- persoenliche Benefit-Historie einsehen
- Coin Wallet sehen

Fuer Admins:

- Benefits anlegen und bearbeiten
- Freigabe-Queue fuer Benefits
- Coin-Verteilung
- Achievement-Verwaltung im Benefit-Kontext

### 18. Coins, Achievements, Avatar und Gamification

Die Plattform hat ein durchgehendes Gamification-System.

Bausteine:

- XP und Level
- Coin-Guthaben
- Achievements mit Kategorien wie Lernen, Zeit, Sozial, Spezial
- Fortschrittsanzeige pro Achievement
- Avatar-Konfiguration mit Emoji, Hautfarbe, Haarfarbe und Hintergrund
- Level-Fortschritt und Meilensteine

Der Gamification-Layer ist in Dashboard, Lernen, Benefits und eigenen Screens sichtbar und kein rein kosmetisches Zusatzmodul.

### 19. Lern-Shop

Es gibt einen separaten Shop fuer avatar- oder gamificationbezogene Items.

Der Screen umfasst:

- Coin-Anzeige
- Kategorien wie Avatar, Power-Ups und Themes
- Shop-Karten mit Preislogik

Wichtig: Im aktuellen UI ist der Kauf-Handler fuer diesen Shop noch als Platzhalter markiert. Der Screen ist also sichtbar, aber nicht vollstaendig verdrahtet.

### 20. Mitarbeitergespraeche / Performance Reviews

Das Gespraechsmodul existiert fuer Admins und Mitarbeitende.

Admin-Seite:

- Templates anlegen, bearbeiten und loeschen
- Gespraeche an Mitarbeitende senden
- Fristen setzen
- Statusuebersicht ueber alle Gespraeche

Mitarbeiter-Seite:

- offene Gespraeche sehen
- Antworten speichern
- Pflichtfragen pruefen
- Gespraech einreichen
- Notizen ergaenzen
- abgeschlossene Gespraeche spaeter wieder ansehen

Damit ist das Modul kein reines Template-System, sondern ein kompletter Mitarbeiter-Workflow.

### 21. Field, Fahrzeuge und betriebliches Equipment

Im Bereich `Field` und den zugehoerigen Admin-Screens sind Betriebs- und Asset-Funktionen vorhanden.

Dazu gehoeren:

- Fahrzeug-Detailansicht mit Tabs fuer Uebersicht, Dokumente, Wartung, Unfaelle, Equipment und Statistiken
- Dokument-Upload pro Fahrzeug
- Wartungsverwaltung
- Equipment direkt am Fahrzeug
- Gesamtansicht ueber alles Fahrzeug-Equipment mit Suche und Statusfiltern
- IT-Equipment-Verwaltung fuer Laptops, Monitore, Smartphones und Zubehoer

Wichtig: Teile der Fahrzeug- und Equipment-Verwaltung arbeiten aktuell hybrid, also teils ueber Edge Functions und teils ueber `localStorage` bzw. Mock-/Initialisierungsdaten.

### 22. Aufgaben / Kanban

Es gibt ein Task-Modul mit Board-Logik.

Enthalten sind:

- mehrere Boards
- Kanban-Darstellung
- Task-Erstellung und Task-Bearbeitung
- Statuswechsel zwischen `TODO`, `IN_PROGRESS` und `DONE`

Wichtig: Die Board-Verwaltung nutzt aktuell `localStorage`, waehrend Task-Operationen bereits gegen die Edge Function `BrowoKoordinator-Tasks` laufen.

### 23. Workflows

Die Plattform enthaelt ein visuelles Workflow-System fuer HR-Prozesse.

Vorhanden sind:

- Workflow-Uebersicht
- Workflow-Analytics und Execution-Historie
- visueller Builder auf Basis von React Flow
- Trigger-Nodes
- Action-Nodes
- HTTP-Request-Node
- Node-Konfigurationspanel
- Validierung vor dem Speichern

Konfigurierbare Aktionsarten umfassen unter anderem:

- E-Mail senden
- Dokument zuweisen
- Test zuweisen
- Video zuweisen
- Aufgabe erstellen
- Equipment zuweisen
- Benefits zuweisen
- Coins verteilen
- Delay / Warten
- HTTP-Request an externe Systeme
- Benachrichtigung erzeugen
- zu Team hinzufuegen
- Schulung zuweisen
- Antrag genehmigen

Trigger koennen mit optionalen Filtern nach Abteilung, Standort oder Rolle versehen werden.

### 24. E-Mail-Templates

Fuer Workflows gibt es ein eigenes Template-System fuer E-Mails.

Funktionen:

- Templates anlegen, bearbeiten und loeschen
- Kategorien wie Onboarding, Offboarding, Benefits, Training, Reminder
- Rich-Text-Editor fuer HTML-Mails
- Plain-Text-Ableitung
- Variablen-Erkennung ueber Platzhalter wie `{{ employeeName }}`
- Vorschau

### 25. Dashboard-Mitteilungen

HR/Admins koennen zentrale Dashboard-Mitteilungen pflegen.

Funktionen:

- Mitteilungen erstellen, bearbeiten und loeschen
- Rich Content Editor
- Push-to-Live
- Entzug aus der Live-Ansicht
- Historie mehrerer Mitteilungen
- Verknuepfung mit Videos und Benefits

Im aktuellen Konzept kann immer nur eine Mitteilung gleichzeitig live sein.

### 26. Automationenverwaltung

Das Modul `Automationenverwaltung` richtet sich auf externe Integrationen, vor allem n8n.

Funktionen:

- API Keys erstellen
- API Keys umbenennen
- API Keys loeschen
- Nutzungs- und Statistikansicht pro Key
- Dokumentation fuer `X-API-Key`
- Bezug auf zahlreiche bereitgestellte API-Routen

### 27. System Health

Der Screen `System Health` ist ein Betriebsdashboard fuer die Backend-Funktionen.

Aktuell enthalten:

- Health Checks fuer 14 Kern-Edge-Functions
- Response Times
- Fehlerstatus
- Log-Historie pro Function
- manuelle Einzelpruefung
- globale Pruefung
- Auto-Refresh alle 60 Sekunden
- Anzeige bekannter Routes pro Function

Das ist besonders hilfreich, weil HR Koordinator viele Fachmodule ueber getrennte Edge Functions anbietet.

### 28. Querschnitts- und Plattformfeatures

Neben den Fachmodulen gibt es einige Produktfunktionen, die quer ueber die Anwendung laufen:

- Security Headers beim App-Start
- Error Boundary und dedizierte Verbindungsfehler-Screens
- automatische Diagnostik fuer Supabase-Verbindungen in der Entwicklung
- Lazy Loading fuer viele Screens und Admin-Module
- Service Worker in Production fuer Caching und Update-Erkennung
- Storage-Diagnose im Admin-Bereich
- zentrale Services, Stores und Hooks pro Fachdomane

Diese Punkte sind wichtig, weil sie zeigen, dass der Code nicht nur aus Screens besteht, sondern bereits betriebliche Qualitaets- und Stabilitaetsbausteine besitzt.

### 29. Chat, Knowledge und Feedback

Die Oberflaechen fuer Chat, Gruppen, Knowledge und Feedback sind bereits sichtbar:

- eigener Chat-Screen
- globales Floating Chat Window
- Tabs fuer Direct Messages, Gruppen, Knowledge und Feedback

Wichtig: Im aktuellen Frontend sind diese Oberflaechen noch weitgehend mit Mock-Daten befuellt oder als Platzhalter markiert. Gleichzeitig existiert bereits ein umfangreicher `chatService` und eine Chat-Edge-Function. Fuer Aussenstehende bedeutet das: Die Grundlage ist vorhanden, die End-to-End-Produktreife der Oberflaechen ist aber noch nicht auf dem Niveau der Kernmodule.

## Rollenmodell im Produkt

Die Berechtigungslogik ist zentral definiert und nicht nur ueber harte Rollenabfragen verstreut.

Beispiele fuer produktrelevante Rechte:

- `view_dashboard`
- `track_time`
- `submit_leave_request`
- `approve_leave_requests`
- `view_courses`
- `take_quizzes`
- `manage_benefits`
- `view_organigram`
- `manage_teams`
- `access_admin_area`
- `edit_company_settings`
- `manage_workflows`
- `manage_field`

Das ist wichtig, weil die Plattform nicht nur ein Employee Portal ist, sondern gleichzeitig Self-Service-, Lead- und Admin-Software.

## Technische Architektur

### Frontend

- React 18
- Vite
- React Router
- Zustand fuer State Management
- shadcn/ui und Radix UI fuer UI-Bausteine
- React Flow fuer Workflow- und Builder-Oberflaechen
- Recharts fuer Diagramme

### Backend

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Edge Functions
- Hono-basierte Server-/BFF-Module

### Wichtige Backend-Module im Repo

Es existieren unter anderem Edge Functions fuer:

- Antragmanager
- Analytics
- Automation
- Benefits
- Chat
- Dokumente
- Email Templates
- Email Tracking
- Fahrzeuge
- Field
- Kalender
- Lernen
- Mitarbeitergespraeche
- Notification
- Organigram
- Personalakte
- Scheduled Executions
- Tasks
- Workflows
- Zeiterfassung

## Reifegrad und ehrliche Einordnung

Nicht alle Module haben denselben Reifegrad. Fuer eine realistische Einordnung:

### Stark integrierte Kernmodule

Diese Bereiche sind im Code klar als Produktkern ausgebaut:

- Auth und Rollen
- Dashboard
- Meine Daten / Personalakte
- Zeiterfassung
- Kalender und Abwesenheiten
- Team- und Mitarbeiterverwaltung
- Organigramm
- Lernen inklusive Wiki
- Benefits
- Mitarbeitergespraeche

### Fortgeschrittene Admin-/Ops-Module mit Backend-Abhaengigkeit

Diese Bereiche sind vorhanden, entfalten aber ihren vollen Wert erst mit korrekt deployten Functions und Migrations:

- Workflows
- E-Mail-Templates
- Automationenverwaltung
- System Health
- Training Compliance
- Test Builder

### Hybrid- oder Entwicklungsbereiche

Diese Bereiche sind sichtbar und teilweise nutzbar, enthalten aber im aktuellen Stand noch Mock-, Fallback- oder LocalStorage-Anteile:

- Chat-Oberflaechen
- Lern-Shop-Kaufprozess
- Tasks-Board-Verwaltung
- Teile der Fahrzeug- und Equipment-Verwaltung
- IT-Equipment mit Mock-Initialisierung bei leerem Backend

## Lokales Setup

### Voraussetzungen

- Node.js
- npm
- lokales oder angebundenes Supabase-Projekt

### Umgebungsvariablen

Die minimale lokale Konfiguration ist in [.env.example](.env.example) hinterlegt:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<Anon Key aus der Ausgabe von `supabase start`>
```

### Starten

```bash
npm install
npm run dev
```

Danach laeuft die App im Vite-Development-Server.

## Was man fuer den Vollbetrieb braucht

Nur das Frontend zu starten reicht fuer den kompletten Produktumfang nicht aus. Fuer die volle Plattform werden gebraucht:

- passende Supabase-Migrations
- deployte Edge Functions
- Storage Buckets
- gueltige Projekt- und API-Keys

Ohne diesen Unterbau funktionieren manche Kernmodule nur eingeschraenkt oder fallen auf Fallbacks zurueck.

## Projektstruktur

Die wichtigsten Verzeichnisse:

- `src/screens` fuer Route-Level-Screens
- `src/components` fuer UI- und Fachkomponenten
- `src/layouts` fuer Mitarbeiter- und Admin-Layout
- `src/stores` fuer Zustand-Stores
- `src/services` fuer fachliche API-Zugriffe
- `src/hooks` fuer zusammengesetzte UI-/Domain-Logik
- `src/supabase/functions` fuer Edge Functions
- `src/supabase/migrations` fuer Datenbank-Migrations

## Warum dieses README so ausfuehrlich ist

Dieses Projekt ist keine kleine Einzel-App, sondern eine Plattform mit vielen miteinander verzahnten Modulen. Das README soll deshalb nicht nur die Anwendung starten helfen, sondern fuer neue Entwickler, Stakeholder oder Betreiber sofort erklaeren:

- welches Problem das Produkt loest
- welche Rollen es bedient
- wie die wichtigsten Journeys aussehen
- welche Module bereits vorhanden sind
- wo Kernprodukt und wo noch Entwicklungsflaeche ist

## Kurzfazit

HR Koordinator ist eine breit angelegte HR-Operations-Plattform mit starkem Fokus auf Alltagsprozesse statt reinem Stammdatenmanagement. Besonders stark sind heute die Bereiche Personalakte, Zeiterfassung, Kalender, Teamverwaltung, Organigramm, Lernen, Benefits und Gespraeche. Darueber hinaus gibt es bereits fortgeschrittene Automations-, Workflow- und Betriebsbausteine, plus einige sichtbare Entwicklungsbereiche, die noch auf den letzten Schritt Richtung Produktionsreife gebracht werden muessen.
