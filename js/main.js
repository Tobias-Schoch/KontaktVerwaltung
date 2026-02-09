/**
 * Main Application Entry Point
 */

import appState from './state/app-state.js';
import fileSystemService from './services/file-system-service.js';
import contactService from './services/contact-service.js';
import { showToast, debounce } from './utils/helpers.js';
import { generateDemoData } from './utils/demo-data.js';
import { ContactForm } from './components/contact-form.js';
import { ContactDetail } from './components/contact-detail.js';

class App {
    constructor() {
        this.currentView = 'contacts';
        this.searchQuery = '';
        this.init();
    }

    /**
     * App Initialisierung
     */
    async init() {
        console.log('🚀 Adressverwaltung wird gestartet...');

        // Theme aus localStorage laden
        this.initTheme();

        // Storage-Mode anzeigen
        this.updateStorageIndicator();

        // Event Listeners
        this.setupEventListeners();

        // Session wiederherstellen
        await this.restoreSession();

        // Initiale View rendern
        this.renderView(this.currentView);

        // Before Unload Warning (für Fallback-Mode)
        fileSystemService.setupBeforeUnloadWarning();

        console.log('✓ App initialisiert');
    }

    /**
     * Theme initialisieren
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        appState.updateSettings({ theme: savedTheme });
    }

    /**
     * Session wiederherstellen
     */
    async restoreSession() {
        try {
            const data = await fileSystemService.restoreSession();
            if (data) {
                appState.loadState(data);
                showToast('Daten geladen', 'success', 2000);
                this.updateCounters();
            } else {
                console.log('Keine vorherige Session gefunden');
            }
        } catch (error) {
            console.error('Fehler beim Wiederherstellen der Session:', error);
            showToast('Fehler beim Laden der Daten', 'error');
        }
    }

    /**
     * Storage Indicator aktualisieren
     */
    updateStorageIndicator() {
        const indicator = document.getElementById('storageIndicator');
        if (!indicator) return;

        const mode = fileSystemService.getStorageMode();
        const text = indicator.querySelector('.storage-indicator__text');

        if (mode === 'filesystem') {
            text.textContent = 'Auto-Save';
            indicator.classList.remove('storage-indicator--fallback');
            indicator.title = 'File System Access API aktiv (Auto-Save)';
        } else {
            text.textContent = 'Manuell';
            indicator.classList.add('storage-indicator--fallback');
            indicator.title = 'Fallback-Mode aktiv (Manuelles Speichern erforderlich)';
        }
    }

    /**
     * Event Listeners einrichten
     */
    setupEventListeners() {
        // Theme Toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Save Button
        document.getElementById('saveButton')?.addEventListener('click', async () => {
            await this.handleSave();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.navigateTo(view);
            });
        });

        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const debouncedSearch = debounce((value) => {
                this.handleSearch(value);
            }, 300);

            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });

            // Keyboard Shortcuts
            document.addEventListener('keydown', (e) => {
                // CMD/Ctrl + K - Search
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    searchInput.focus();
                }

                // CMD/Ctrl + N - New Contact
                if ((e.metaKey || e.ctrlKey) && e.key === 'n' && this.currentView === 'contacts') {
                    e.preventDefault();
                    const form = new ContactForm();
                    form.open('create');
                }
            });
        }

        // State Changes
        appState.subscribe('state:dirty', (isDirty) => {
            this.updateSaveButton(isDirty);
        });

        appState.subscribe('contacts:added', () => this.updateCounters());
        appState.subscribe('contacts:deleted', () => this.updateCounters());
        appState.subscribe('contacts:updated', () => this.updateCounters());
        appState.subscribe('contacts:changed', () => {
            this.updateCounters();
            if (this.currentView === 'contacts') {
                this.renderView('contacts');
            }
        });
        appState.subscribe('groups:added', () => this.updateCounters());
        appState.subscribe('groups:deleted', () => this.updateCounters());
        appState.subscribe('events:added', () => this.updateCounters());
        appState.subscribe('events:deleted', () => this.updateCounters());
    }

    /**
     * Theme umschalten
     */
    toggleTheme() {
        const current = appState.getSettings().theme;
        const newTheme = current === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        appState.updateSettings({ theme: newTheme });

        showToast(`${newTheme === 'dark' ? 'Dunkles' : 'Helles'} Theme aktiviert`, 'info', 2000);
    }

    /**
     * Speichern
     */
    async handleSave() {
        const mode = fileSystemService.getStorageMode();
        const data = appState.exportState();

        try {
            if (mode === 'filesystem') {
                await fileSystemService.save(data);
                appState.markClean();
                showToast('Gespeichert', 'success', 2000);
            } else {
                // Fallback: Download
                fileSystemService.downloadFile(data);
                appState.markClean();
                showToast('Datei heruntergeladen', 'success', 2000);
            }
        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            showToast('Speichern fehlgeschlagen', 'error');
        }
    }

    /**
     * Save Button State
     */
    updateSaveButton(isDirty) {
        const saveBtn = document.getElementById('saveButton');
        if (!saveBtn) return;

        if (isDirty) {
            saveBtn.style.color = 'var(--color-primary)';
            saveBtn.title = 'Ungespeicherte Änderungen';
        } else {
            saveBtn.style.color = '';
            saveBtn.title = 'Speichern';
        }
    }

    /**
     * Counter aktualisieren
     */
    updateCounters() {
        const contacts = appState.getContacts();
        const groups = appState.getGroups();
        const events = appState.getEvents();

        document.getElementById('contactsCount').textContent = contacts.length;
        document.getElementById('groupsCount').textContent = groups.length;
        document.getElementById('eventsCount').textContent = events.length;
    }

    /**
     * Navigation
     */
    navigateTo(view) {
        this.currentView = view;
        this.renderView(view);

        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('nav-item--active', item.dataset.view === view);
        });

        // Update URL (ohne Reload)
        window.location.hash = view;
    }

    /**
     * View rendern
     */
    renderView(view) {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;

        switch (view) {
            case 'contacts':
                this.renderContactsView(mainContent);
                break;
            case 'groups':
                this.renderGroupsView(mainContent);
                break;
            case 'events':
                this.renderEventsView(mainContent);
                break;
            case 'settings':
                this.renderSettingsView(mainContent);
                break;
            default:
                this.renderContactsView(mainContent);
        }
    }

    /**
     * Demo-Daten laden
     */
    loadDemoData() {
        const data = generateDemoData();
        appState.loadState(data);
        showToast('Demo-Daten geladen (6 Kontakte)', 'success');
        this.renderView('contacts');
        this.updateCounters();
    }

    /**
     * Contacts View
     */
    renderContactsView(container) {
        // Search anwenden
        const contacts = this.searchQuery
            ? contactService.search(this.searchQuery)
            : contactService.list();

        container.innerHTML = `
            <div class="view-container p-6">
                <div class="view-header flex items-center justify-between mb-6">
                    <div>
                        <h1 class="text-3xl font-semibold">Kontakte</h1>
                        <p class="text-secondary mt-2">${contacts.length} ${contacts.length === 1 ? 'Kontakt' : 'Kontakte'}</p>
                    </div>
                    <div class="flex gap-3">
                        ${contacts.length === 0 ? `
                            <button class="btn btn--secondary" id="loadDemoBtn">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M13 3L4 12L8 16L17 7V3H13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="9.5" cy="9.5" r="1.5" fill="currentColor"/>
                                </svg>
                                Demo-Daten laden
                            </button>
                        ` : ''}
                        <button class="btn btn--secondary" id="importBtn">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M10 15V3M10 3L5 8M10 3L15 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M3 17H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            ${contacts.length === 0 ? 'Importieren' : 'Öffnen'}
                        </button>
                        <button class="btn btn--primary" id="addContactBtn">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Kontakt hinzufügen
                        </button>
                    </div>
                </div>

                <div class="contacts-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
                    ${contacts.length === 0
                        ? this.searchQuery
                            ? this.renderNoResultsState()
                            : this.renderEmptyState('Kontakte')
                        : this.renderContactCards(contacts)}
                </div>
            </div>
        `;

        // Event Listeners
        document.getElementById('loadDemoBtn')?.addEventListener('click', () => {
            this.loadDemoData();
        });

        document.getElementById('addContactBtn')?.addEventListener('click', () => {
            const form = new ContactForm();
            form.open('create');
        });

        document.getElementById('importBtn')?.addEventListener('click', async () => {
            if (fileSystemService.getStorageMode() === 'fallback') {
                const data = await fileSystemService.uploadFile();
                if (data) {
                    appState.loadState(data);
                    showToast('Daten importiert', 'success');
                    this.renderView('contacts');
                    this.updateCounters();
                }
            } else {
                const data = await fileSystemService.openFile();
                if (data) {
                    appState.loadState(data);
                    showToast('Datei geöffnet', 'success');
                    this.renderView('contacts');
                    this.updateCounters();
                }
            }
        });

        // Contact Card Click Events
        container.querySelectorAll('.contact-card').forEach(card => {
            card.addEventListener('click', () => {
                const contactId = card.dataset.contactId;
                if (contactId) {
                    const detail = new ContactDetail(contactId);
                    detail.open();
                }
            });

            // Hover Effect Enhancement
            card.style.cursor = 'pointer';
        });
    }

    /**
     * Contact Cards rendern
     */
    renderContactCards(contacts) {
        return contacts.map(contact => {
            const initials = this.getInitials(contact.fields.firstName, contact.fields.lastName);
            const fullName = `${contact.fields.firstName || ''} ${contact.fields.lastName || ''}`.trim() || 'Unbenannt';
            return `
                <div class="card contact-card" data-contact-id="${contact.id}">
                    <div class="contact-card__avatar">${initials}</div>
                    <div class="contact-card__name">${this.escapeHtml(fullName)}</div>
                    ${contact.fields.email ? `<div class="contact-card__email">${this.escapeHtml(contact.fields.email)}</div>` : ''}
                    ${contact.fields.company ? `<div class="text-sm text-secondary">${this.escapeHtml(contact.fields.company)}</div>` : ''}
                    ${contact.fields.phone || contact.fields.mobile ? `
                        <div class="text-sm text-secondary mt-2">
                            ${contact.fields.phone ? this.escapeHtml(contact.fields.phone) : this.escapeHtml(contact.fields.mobile)}
                        </div>
                    ` : ''}
                    ${contact.tags && contact.tags.length > 0 ? `
                        <div class="contact-card__tags mt-3">
                            ${contact.tags.map(tag => `<span class="contact-card__tag">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Groups View
     */
    renderGroupsView(container) {
        container.innerHTML = `
            <div class="view-container p-6">
                <h1 class="text-3xl font-semibold mb-6">Gruppen</h1>
                ${this.renderEmptyState('Gruppen')}
            </div>
        `;
    }

    /**
     * Events View
     */
    renderEventsView(container) {
        container.innerHTML = `
            <div class="view-container p-6">
                <h1 class="text-3xl font-semibold mb-6">Events</h1>
                ${this.renderEmptyState('Events')}
            </div>
        `;
    }

    /**
     * Settings View
     */
    renderSettingsView(container) {
        const settings = appState.getSettings();
        const mode = fileSystemService.getStorageMode();

        container.innerHTML = `
            <div class="view-container p-6">
                <h1 class="text-3xl font-semibold mb-6">Einstellungen</h1>

                <div class="card mb-6">
                    <h3 class="text-lg font-semibold mb-4">Darstellung</h3>
                    <div class="input-group">
                        <label class="input-label">Theme</label>
                        <select class="input select" id="themeSelect">
                            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Hell</option>
                            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dunkel</option>
                        </select>
                    </div>
                </div>

                <div class="card">
                    <h3 class="text-lg font-semibold mb-4">Speicherung</h3>
                    <div class="mb-4">
                        <div class="text-sm font-medium mb-2">Storage-Mode:</div>
                        <div class="text-sm text-secondary">
                            ${mode === 'filesystem'
                                ? '✓ File System Access API (Auto-Save aktiviert)'
                                : '⚠ Fallback-Mode (Manuelles Speichern erforderlich)'}
                        </div>
                    </div>
                    <div class="text-sm text-tertiary">
                        ${mode === 'filesystem'
                            ? 'Ihre Daten werden automatisch in der gewählten Datei gespeichert.'
                            : 'Firefox und Safari unterstützen kein Auto-Save. Bitte speichern Sie manuell.'}
                    </div>
                </div>
            </div>
        `;

        // Theme Select
        document.getElementById('themeSelect')?.addEventListener('change', (e) => {
            const theme = e.target.value;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            appState.updateSettings({ theme });
        });
    }

    /**
     * Empty State
     */
    renderEmptyState(entityName) {
        return `
            <div class="loading-screen">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="2" opacity="0.2"/>
                </svg>
                <p class="text-secondary">Noch keine ${entityName}</p>
            </div>
        `;
    }

    /**
     * No Results State (für Suche)
     */
    renderNoResultsState() {
        return `
            <div class="loading-screen">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <circle cx="28" cy="28" r="18" stroke="currentColor" stroke-width="3" opacity="0.2"/>
                    <path d="M42 42L54 54" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.2"/>
                </svg>
                <p class="text-secondary">Keine Kontakte gefunden</p>
                <p class="text-tertiary text-sm">Versuchen Sie andere Suchbegriffe</p>
            </div>
        `;
    }

    /**
     * Suche
     */
    handleSearch(query) {
        this.searchQuery = query;

        if (this.currentView === 'contacts') {
            this.renderView('contacts');
        }

        // Update Search Input Value (falls aus Code getriggert)
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value !== query) {
            searchInput.value = query;
        }
    }

    /**
     * Initials Helper
     */
    getInitials(firstName = '', lastName = '') {
        const first = firstName.trim().charAt(0).toUpperCase();
        const last = lastName.trim().charAt(0).toUpperCase();
        return first + last || '?';
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// App starten wenn DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new App();
    });
} else {
    new App();
}
