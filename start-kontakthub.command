#!/bin/bash

# KontaktHub Server Starter
# Einfach per Doppelklick starten!

clear
echo "=================================="
echo "  🚀 KontaktHub wird gestartet..."
echo "=================================="
echo ""

# Ins richtige Verzeichnis wechseln
cd "$(dirname "$0")"

echo "✓ Verzeichnis: $(pwd)"
echo "✓ Starte Server auf Port 8000..."
echo ""
echo "📱 Öffne im Browser: http://localhost:8000"
echo ""
echo "⚠️  Zum Beenden: Dieses Fenster schließen oder Ctrl+C drücken"
echo ""
echo "=================================="
echo ""

# Browser automatisch öffnen (nach 2 Sekunden)
sleep 2 && open http://localhost:8000 &

# Python Server starten
python3 -m http.server 8000
