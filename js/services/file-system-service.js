/**
 * File System Service - Cross-Browser Storage Abstraction
 * Unterstützt File System Access API (Chrome/Edge) mit Fallback (Firefox/Safari)
 */

import appState from '../state/app-state.js';

class FileSystemService {
    constructor() {
        this.fileHandle = null;
        this.storageMode = this.detectStorageMode();
        this.dbName = 'KontaktHubDB';
        this.dbVersion = 1;
        this.db = null;
        this.dbReady = false;

        // IndexedDB initialisieren und Promise speichern
        this.dbInitPromise = this.initIndexedDB().then(() => {
            this.dbReady = true;
            console.log('✓ IndexedDB initialisiert');
        });
    }

    /**
     * Browser-Detection für Storage-Mode
     */
    detectStorageMode() {
        if ('showSaveFilePicker' in window) {
            console.log('✓ File System Access API verfügbar (Chrome/Edge)');
            return 'filesystem';
        } else {
            console.log('✗ File System Access API nicht verfügbar, Fallback-Mode aktiviert (Firefox/Safari)');
            return 'fallback';
        }
    }

    /**
     * IndexedDB für Working Copy initialisieren
     */
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store für Working Copy
                if (!db.objectStoreNames.contains('workingCopy')) {
                    db.createObjectStore('workingCopy');
                }

                // Store für File Handle (nur Chrome/Edge)
                if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles');
                }
            };
        });
    }

    /**
     * File Handle in IndexedDB speichern (nur Chrome/Edge)
     */
    async saveFileHandle(handle) {
        if (this.storageMode !== 'filesystem' || !this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fileHandles'], 'readwrite');
            const store = transaction.objectStore('fileHandles');
            const request = store.put(handle, 'currentFile');

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * File Handle aus IndexedDB laden (nur Chrome/Edge)
     */
    async loadFileHandle() {
        if (this.storageMode !== 'filesystem' || !this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fileHandles'], 'readonly');
            const store = transaction.objectStore('fileHandles');
            const request = store.get('currentFile');

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Working Copy in IndexedDB speichern
     */
    async saveWorkingCopy(data) {
        // Warte auf DB-Initialisierung
        await this.dbInitPromise;

        if (!this.db) {
            console.error('IndexedDB nicht verfügbar');
            return;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workingCopy'], 'readwrite');
            const store = transaction.objectStore('workingCopy');
            const request = store.put(data, 'current');

            request.onsuccess = () => {
                console.log('✓ Daten in IndexedDB gespeichert');
                resolve();
            };
            request.onerror = () => {
                console.error('✗ Fehler beim Speichern in IndexedDB:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Working Copy aus IndexedDB laden
     */
    async loadWorkingCopy() {
        // Warte auf DB-Initialisierung
        await this.dbInitPromise;

        if (!this.db) {
            console.error('IndexedDB nicht verfügbar');
            return null;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workingCopy'], 'readonly');
            const store = transaction.objectStore('workingCopy');
            const request = store.get('current');

            request.onsuccess = () => {
                if (request.result) {
                    console.log('✓ Daten aus IndexedDB geladen');
                } else {
                    console.log('ℹ Keine Daten in IndexedDB gefunden');
                }
                resolve(request.result);
            };
            request.onerror = () => {
                console.error('✗ Fehler beim Laden aus IndexedDB:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Neue Datei erstellen (Chrome/Edge)
     */
    async createFile() {
        if (this.storageMode !== 'filesystem') {
            throw new Error('File System Access API nicht verfügbar');
        }

        try {
            const handle = await window.showSaveFilePicker({
                types: [{
                    description: 'Contact Address Database',
                    accept: { 'application/json': ['.caddb'] }
                }],
                suggestedName: 'kontakte.caddb'
            });

            this.fileHandle = handle;
            await this.saveFileHandle(handle);

            return handle;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Fehler beim Erstellen der Datei:', error);
                throw error;
            }
            return null;
        }
    }

    /**
     * Bestehende Datei öffnen (Chrome/Edge)
     */
    async openFile() {
        if (this.storageMode !== 'filesystem') {
            throw new Error('File System Access API nicht verfügbar');
        }

        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Contact Address Database',
                    accept: { 'application/json': ['.caddb'] }
                }],
                multiple: false
            });

            this.fileHandle = handle;
            await this.saveFileHandle(handle);

            const file = await handle.getFile();
            const content = await file.text();
            const data = JSON.parse(content);

            await this.saveWorkingCopy(data);
            return data;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Fehler beim Öffnen der Datei:', error);
                throw error;
            }
            return null;
        }
    }

    /**
     * In aktuelle Datei speichern (Chrome/Edge)
     */
    async save(data) {
        if (this.storageMode !== 'filesystem') {
            throw new Error('Verwenden Sie downloadFile() im Fallback-Mode');
        }

        if (!this.fileHandle) {
            // Kein Handle vorhanden, neue Datei erstellen
            await this.createFile();
            if (!this.fileHandle) return false; // User hat abgebrochen
        }

        try {
            // Verify permission
            const permission = await this.fileHandle.queryPermission({ mode: 'readwrite' });
            if (permission !== 'granted') {
                const newPermission = await this.fileHandle.requestPermission({ mode: 'readwrite' });
                if (newPermission !== 'granted') {
                    throw new Error('Keine Berechtigung zum Schreiben');
                }
            }

            const writable = await this.fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();

            await this.saveWorkingCopy(data);
            return true;
        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            throw error;
        }
    }

    /**
     * Datei herunterladen (Fallback für Firefox/Safari)
     */
    downloadFile(data, filename = 'kontakte.caddb') {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);

        // Working Copy speichern
        this.saveWorkingCopy(data);
    }

    /**
     * Datei hochladen (Fallback für Firefox/Safari)
     */
    async uploadFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.caddb,application/json';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    resolve(null);
                    return;
                }

                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    await this.saveWorkingCopy(data);
                    resolve(data);
                } catch (error) {
                    console.error('Fehler beim Laden der Datei:', error);
                    reject(error);
                }
            };

            input.click();
        });
    }

    /**
     * Auto-Save (nur Chrome/Edge mit bestehendem Handle)
     */
    async autoSave() {
        if (this.storageMode !== 'filesystem' || !this.fileHandle) {
            return false;
        }

        try {
            const data = appState.exportState();
            await this.save(data);
            return true;
        } catch (error) {
            console.error('Auto-Save fehlgeschlagen:', error);
            return false;
        }
    }

    /**
     * Prüfen ob ungespeicherte Änderungen existieren
     */
    hasUnsavedChanges() {
        return appState.isDirty();
    }

    /**
     * Warning bei ungespeicherten Änderungen (Fallback-Mode)
     */
    setupBeforeUnloadWarning() {
        if (this.storageMode === 'fallback') {
            window.addEventListener('beforeunload', (e) => {
                if (this.hasUnsavedChanges()) {
                    e.preventDefault();
                    e.returnValue = '';
                    return '';
                }
            });
        }
    }

    /**
     * Storage-Mode abrufen
     */
    getStorageMode() {
        return this.storageMode;
    }

    /**
     * Prüfen ob aktuelles File Handle vorhanden ist
     */
    hasFileHandle() {
        return this.fileHandle !== null;
    }

    /**
     * Beim App-Start versuchen vorheriges File Handle zu laden
     */
    async restoreSession() {
        if (this.storageMode === 'filesystem') {
            try {
                const handle = await this.loadFileHandle();
                if (handle) {
                    // Verify permission
                    const permission = await handle.queryPermission({ mode: 'readwrite' });
                    if (permission === 'granted') {
                        this.fileHandle = handle;
                        const file = await handle.getFile();
                        const content = await file.text();
                        const data = JSON.parse(content);
                        return data;
                    }
                }
            } catch (error) {
                console.warn('Konnte vorherige Session nicht wiederherstellen:', error);
            }
        }

        // Fallback: Working Copy laden
        const workingCopy = await this.loadWorkingCopy();
        return workingCopy;
    }
}

const fileSystemService = new FileSystemService();
export default fileSystemService;
