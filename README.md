# Adressverwaltung

Moderne lokale Kontaktverwaltung mit WOW-UI/UX - vollständig mit HTML/CSS/JavaScript.

## Features

✅ **WOW-UI/UX:** Moderne Animations, Drag & Drop, Dark/Light Mode
✅ **Lokale Datenhaltung:** File-based Storage (Browser-unabhängig)
✅ **Cross-Browser:** Chrome, Firefox, Safari support
✅ **Flexibilität:** Dynamische Custom Fields
✅ **Historie:** Vollständige Versionierung (geplant)
✅ **Privacy:** Alle Daten lokal, Email mit BCC

## Technologie

- Pure HTML5, CSS3, Vanilla JavaScript (ES6+)
- File System Access API (Chrome/Edge) mit Fallback (Firefox/Safari)
- IndexedDB für Working Copy
- Keine Frameworks, keine Build-Tools erforderlich

## Entwicklungsstand

**Phase 1: Grundgerüst & Storage** ✓ (Aktiv in Entwicklung)
- App Shell mit Navigation
- Theme System (Light/Dark Mode)
- File System Service (Cross-Browser)
- State Management (Observer Pattern)

**Phase 2-8:** Siehe PLAN.md

## Installation & Start

### Einfach im Browser öffnen:

```bash
# Option 1: Direkt öffnen
open index.html

# Option 2: Mit lokalem Server (empfohlen für ES6 Modules)
python3 -m http.server 8000
# Dann öffnen: http://localhost:8000
```

### Browser-Kompatibilität:

- **Chrome/Edge:** ✓ Volle Unterstützung (Auto-Save)
- **Firefox:** ✓ Fallback-Mode (Manuelles Speichern)
- **Safari:** ✓ Fallback-Mode (Manuelles Speichern)

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
- `⌘S` / `Ctrl+S` - Speichern (geplant)

## Roadmap

- [x] App Shell & Navigation
- [x] Theme System
- [x] File System Service
- [x] State Management
- [ ] Kontaktverwaltung (CRUD)
- [ ] Gruppenverwaltung
- [ ] Events
- [ ] Custom Fields
- [ ] Historie & Versionierung
- [ ] Import/Export (CSV)
- [ ] Drag & Drop

## Lizenz

Privates Projekt
