# Adressverwaltung

Moderne lokale Kontaktverwaltung mit WOW-UI/UX - vollständig mit HTML/CSS/JavaScript.

## Features

✅ **WOW-UI/UX:** Moderne Animations, Dark/Light Mode, Responsive Design
✅ **Kontaktverwaltung:** Vollständige CRUD Operations mit Form & Detail View
✅ **Search & Filter:** Real-time Suche mit Debouncing
✅ **Lokale Datenhaltung:** File-based Storage (Browser-unabhängig)
✅ **Cross-Browser:** Chrome, Firefox, Safari support
✅ **Keyboard Shortcuts:** Cmd+K (Search), Cmd+N (New Contact), ESC (Close)
✅ **Privacy:** Alle Daten lokal

## Technologie

- Pure HTML5, CSS3, Vanilla JavaScript (ES6+)
- File System Access API (Chrome/Edge) mit Fallback (Firefox/Safari)
- IndexedDB für Working Copy
- Keine Frameworks, keine Build-Tools erforderlich

## Entwicklungsstand

**Phase 1: Grundgerüst & Storage** ✅ ABGESCHLOSSEN
- App Shell mit Navigation
- Theme System (Light/Dark Mode)
- File System Service (Cross-Browser)
- State Management (Observer Pattern)

**Phase 2: Kontaktverwaltung** ✅ ABGESCHLOSSEN
- Contact Form Modal (Create/Edit)
- Contact Detail View (Side-Panel)
- CRUD Operations (Create, Read, Update, Delete)
- Search & Filter (Real-time)
- Keyboard Shortcuts (Cmd+N, Cmd+K)
- Smooth Animations

**Phase 3: Gruppenverwaltung & Drag & Drop** ✅ ABGESCHLOSSEN
- Group CRUD Operations
- Group Form & Detail View
- Drag & Drop System (Contacts → Groups)
- Member-Management
- Email All (BCC)
- 17 Farben, Color Picker
- Bidirektionale Relationships

**Phase 4-8:** In Planung (siehe PLAN.md)

## Installation & Start

### Einfach im Browser öffnen:

```bash
# Mit lokalem Server (empfohlen für ES6 Modules)
python3 -m http.server 8080
# Dann öffnen: http://localhost:8080
```

### Browser-Kompatibilität:

- **Chrome/Edge:** ✓ Volle Unterstützung (Auto-Save)
- **Firefox:** ✓ Fallback-Mode (Manuelles Speichern)
- **Safari:** ✓ Fallback-Mode (Manuelles Speichern)

## Usage

### Erste Schritte:

1. **Demo-Daten laden:** Klicken Sie auf "Demo-Daten laden" für 6 Beispiel-Kontakte
2. **Neuer Kontakt:** Klick auf "+ Kontakt hinzufügen" oder `Cmd+N`
3. **Details anzeigen:** Klick auf eine Kontakt-Card
4. **Bearbeiten:** Edit-Button in Detail-View oder Doppelklick
5. **Suchen:** Klick in Suchfeld oder `Cmd+K`
6. **Speichern:** Save-Button (Topbar) testet Browser-Unterstützung

## Storage-Modi

### Chrome/Edge (File System Access API)
- Direkter Dateisystem-Zugriff
- Auto-Save möglich
- Datei einmalig auswählen

### Firefox/Safari (Fallback)
- Manuelles Speichern (Download)
- Manuelles Laden (File Upload)
- Warnung bei ungespeicherten Änderungen

## Dateiformat

Dateien werden im `.caddb` Format (JSON) gespeichert:

```json
{
  "version": "1.0.0",
  "created": "2026-02-09T...",
  "modified": "2026-02-09T...",
  "contacts": [...],
  "groups": [...],
  "events": [...],
  "customFields": [...],
  "settings": {...},
  "history": [...]
}
```

## Keyboard Shortcuts

- `⌘K` / `Ctrl+K` - Suche öffnen
- `⌘N` / `Ctrl+N` - Neuer Kontakt
- `ESC` - Modal/Panel schließen
- `⌘S` / `Ctrl+S` - Speichern (geplant)

## Roadmap

- [x] App Shell & Navigation
- [x] Theme System (Light/Dark Mode)
- [x] File System Service (Cross-Browser)
- [x] State Management (Observer Pattern)
- [x] Kontaktverwaltung (CRUD) ✨ NEU
- [x] Contact Form & Detail View ✨ NEU
- [x] Search & Filter ✨ NEU
- [ ] Gruppenverwaltung (Nächster Schritt)
- [ ] Drag & Drop System
- [ ] Events
- [ ] Custom Fields
- [ ] Historie & Versionierung
- [ ] Import/Export (CSV)

## Projekt-Struktur

```
AdressVerwaltung/
├── index.html
├── styles/
│   ├── main.css
│   ├── tokens/ (colors, spacing, animations)
│   ├── base/ (reset, typography, utilities)
│   ├── components/ (18 files)
│   └── layouts/ (shell, responsive)
└── js/
    ├── main.js
    ├── state/ (app-state)
    ├── services/ (file-system, contact)
    ├── models/ (contact, group)
    ├── components/ (contact-form, contact-detail)
    └── utils/ (helpers, validation, demo-data)
```

## Screenshots

(Browser öffnen unter http://localhost:8080)

## Dokumentation

- **[PROGRESS.md](PROGRESS.md)** - Aktueller Implementierungsstatus
- **[PHASE2_COMPLETE.md](PHASE2_COMPLETE.md)** - Phase 2 Details
- **[PLAN.md](PLAN.md)** - Vollständiger Implementierungsplan

## Lizenz

Privates Projekt

---

**Status:** Phase 2 Production-Ready! 🎉
