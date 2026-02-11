/**
 * Main Application Entry Point
 */

import appState from './state/app-state.js';
import contactService from './services/contact-service.js';
import groupService from './services/group-service.js';
import eventService from './services/event-service.js';
import csvExportService from './services/csv-export-service.js';
import { Contact } from './models/contact.js';
import { showToast, debounce, formatDate } from './utils/helpers.js';
import { generateDemoData } from './utils/demo-data.js';
import { ContactForm } from './components/contact-form.js';
import { ContactDetail } from './components/contact-detail.js';
import { GroupForm } from './components/group-form.js';
import { GroupDetail } from './components/group-detail.js';
import { EventForm } from './components/event-form.js';
import { EventDetail } from './components/event-detail.js';
import dragDropManager from './utils/drag-drop-manager.js';

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
        // Theme aus localStorage laden
        this.initTheme();

        // Storage-Mode anzeigen
        this.updateStorageIndicator();

        // Event Listeners
        this.setupEventListeners();

        // Daten vom Server laden
        await this.restoreSession();

        // Initiale View rendern
        this.renderView(this.currentView);
    }

    /**
     * Theme initialisieren
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Akzentfarbe aus gespeicherten Settings laden
        const settings = appState.getSettings();
        if (settings.accentColor) {
            this.applyAccentColor(settings.accentColor);
        }
    }

    /**
     * Akzentfarbe anwenden
     */
    applyAccentColor(colorName) {
        const colorMap = {
            'sky': '#0ea5e9',
            'blue': '#3b82f6',
            'indigo': '#6366f1',
            'violet': '#8b5cf6',
            'purple': '#a855f7',
            'pink': '#ec4899',
            'rose': '#f43f5e',
            'red': '#ef4444',
            'orange': '#f97316',
            'amber': '#f59e0b',
            'green': '#10b981',
            'emerald': '#059669',
            'teal': '#14b8a6',
            'cyan': '#06b6d4'
        };

        const colorHex = colorMap[colorName] || colorMap['sky'];
        document.documentElement.style.setProperty('--color-primary', colorHex);
        document.documentElement.style.setProperty('--color-primary-hover', this.adjustColorBrightness(colorHex, -20));
    }

    /**
     * Daten vom Server laden
     */
    async restoreSession() {
        try {
            const success = await appState.loadFromServer();

            if (success) {
                // Settings anwenden (Akzentfarbe)
                const settings = appState.getSettings();
                if (settings.accentColor) {
                    this.applyAccentColor(settings.accentColor);
                }

                this.updateCounters();
                showToast('Verbunden mit Server', 'success', 2000);
            } else {
                showToast('Server nicht erreichbar', 'error');
            }
        } catch (error) {
            console.error('Fehler beim Laden:', error);
            showToast('Fehler beim Laden der Daten', 'error');
        }
    }

    /**
     * Storage Indicator aktualisieren
     */
    updateStorageIndicator() {
        const indicator = document.getElementById('storageIndicator');
        if (!indicator) return;

        const text = indicator.querySelector('.storage-indicator__text');
        text.textContent = 'Server';
        indicator.classList.remove('storage-indicator--fallback');
        indicator.title = 'Daten werden auf dem Server gespeichert';
    }

    startClock() {
        const updateTime = () => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timeString = `${hours}:${minutes}:${seconds}`;

            const timeDisplay = document.getElementById('timeDisplay');
            if (timeDisplay) {
                const timeText = timeDisplay.querySelector('.time-display__text');
                if (timeText) {
                    timeText.textContent = timeString;
                }
            }
        };

        // Sofort aktualisieren
        updateTime();

        // Jede Sekunde aktualisieren
        setInterval(updateTime, 1000);
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

        // Sidebar schließen bei außerhalb-Click (Mobile)
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const hamburger = document.getElementById('hamburgerBtn');

            if (sidebar && sidebar.classList.contains('active')) {
                if (!sidebar.contains(e.target) && !hamburger?.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            }
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
        appState.subscribe('groups:changed', () => {
            this.updateCounters();
            if (this.currentView === 'groups') {
                this.renderView('groups');
            }
        });
        appState.subscribe('events:added', () => this.updateCounters());
        appState.subscribe('events:deleted', () => this.updateCounters());
        appState.subscribe('events:changed', () => {
            this.updateCounters();
            if (this.currentView === 'events') {
                this.renderView('events');
            }
        });
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
     * Backup exportieren
     */
    async handleSave() {
        const data = appState.exportState();

        try {
            // JSON-Backup herunterladen
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kontakthub-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Backup heruntergeladen', 'success', 2000);
        } catch (error) {
            console.error('Fehler beim Exportieren:', error);
            showToast('Export fehlgeschlagen', 'error');
        }
    }

    /**
     * Save Button State (für Backups)
     */
    updateSaveButton(isDirty) {
        const saveBtn = document.getElementById('saveButton');
        if (!saveBtn) return;

        saveBtn.style.color = '';
        saveBtn.title = 'Backup herunterladen';
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
     * Demo-Daten laden und auf Server speichern
     */
    async loadDemoData() {
        const data = generateDemoData();

        try {
            // Daten auf Server speichern
            for (const contact of data.contacts) {
                await contactService.create(contact);
            }
            for (const group of data.groups) {
                await groupService.create(group);
            }
            for (const event of data.events) {
                await eventService.create(event);
            }

            // Settings anwenden (Theme und Akzentfarbe)
            const settings = data.settings;
            if (settings.theme) {
                document.documentElement.setAttribute('data-theme', settings.theme);
                localStorage.setItem('theme', settings.theme);
            }
            if (settings.accentColor) {
                this.applyAccentColor(settings.accentColor);
            }

            showToast('Demo-Daten geladen (6 Kontakte)', 'success');
            this.renderView('contacts');
            this.updateCounters();
        } catch (error) {
            console.error('Fehler beim Laden der Demo-Daten:', error);
            showToast('Fehler beim Laden der Demo-Daten', 'error');
        }
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
                        <button class="btn btn--secondary" id="importContactsBtn">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M10 15V3M10 3L5 8M10 3L15 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M3 17H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Kontakte importieren
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

        document.getElementById('exportCSVBtn')?.addEventListener('click', () => {
            try {
                csvExportService.exportForMailMerge(contacts);
                showToast('CSV für Serienbrief exportiert', 'success');
            } catch (error) {
                showToast(error.message || 'Fehler beim Exportieren', 'error');
            }
        });

        document.getElementById('addContactBtn')?.addEventListener('click', () => {
            const form = new ContactForm();
            form.open('create');
        });

        document.getElementById('importContactsBtn')?.addEventListener('click', () => {
            this.importContacts();
        });

        // Import Button nicht mehr benötigt bei Server-Speicherung

        // Contact Card Click Events
        container.querySelectorAll('.contact-card').forEach(card => {
            const contactId = card.dataset.contactId;

            // Click: Open Detail
            card.addEventListener('click', (e) => {
                // Ignore if clicking action buttons
                if (e.target.closest('button')) return;

                if (contactId) {
                    const detail = new ContactDetail(contactId);
                    detail.open();
                }
            });

            // Make Draggable für Drag & Drop
            if (contactId) {
                dragDropManager.makeDraggable(card, contactId);
            }

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
        const groups = groupService.list();
        const contacts = contactService.list();

        container.innerHTML = `
            <div class="groups-view-container">
                <!-- Contacts Sidebar -->
                <div class="groups-view__sidebar">
                    <div class="groups-view__sidebar-header">
                        <h3 class="text-base font-semibold">Kontakte</h3>
                        <span class="text-sm text-tertiary">${contacts.length}</span>
                    </div>
                    <div class="groups-view__sidebar-search">
                        <input
                            type="search"
                            class="input input--sm"
                            placeholder="Suche..."
                            id="groupsContactSearch"
                        />
                    </div>
                    <div class="groups-view__contacts" id="groupsContactsList">
                        ${this.renderContactListItems(contacts)}
                    </div>
                </div>

                <!-- Groups Grid -->
                <div class="groups-view__main">
                    <div class="view-header flex items-center justify-between mb-6">
                        <div>
                            <h1 class="text-3xl font-semibold">Gruppen</h1>
                            <p class="text-secondary mt-2">${groups.length} ${groups.length === 1 ? 'Gruppe' : 'Gruppen'}</p>
                        </div>
                        <div class="flex gap-3">
                            <button class="btn btn--primary" id="addGroupBtn">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                Gruppe erstellen
                            </button>
                        </div>
                    </div>

                    <div class="contacts-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
                        ${groups.length === 0 ? this.renderEmptyState('Gruppen') : this.renderGroupCards(groups)}
                    </div>
                </div>
            </div>
        `;

        // Event Listeners
        document.getElementById('addGroupBtn')?.addEventListener('click', () => {
            const form = new GroupForm();
            form.open('create');
        });

        // Contacts Search in Sidebar
        const contactSearch = document.getElementById('groupsContactSearch');
        if (contactSearch) {
            contactSearch.addEventListener('input', debounce((e) => {
                const query = e.target.value.toLowerCase();
                const contactsList = document.getElementById('groupsContactsList');
                const filtered = query
                    ? contacts.filter(c => c.matchesSearch(query))
                    : contacts;
                contactsList.innerHTML = this.renderContactListItems(filtered);
                this.attachContactListItemEvents();
            }, 300));
        }

        // Contact List Items Drag Events
        this.attachContactListItemEvents();

        // Group Card Click Events
        container.querySelectorAll('.group-card').forEach(card => {
            const groupId = card.dataset.groupId;

            // Click: Open Detail
            card.addEventListener('click', (e) => {
                // Ignore if clicking action buttons or during drag
                if (e.target.closest('button')) return;

                if (groupId) {
                    const detail = new GroupDetail(groupId);
                    detail.open();
                }
            });

            // Make Draggable (für Events)
            if (groupId) {
                dragDropManager.makeGroupDraggable(card, groupId);
            }

            // Make Droppable (für Contacts)
            if (groupId) {
                dragDropManager.makeDroppable(card, groupId);
            }

            card.style.cursor = 'grab';
        });
    }

    /**
     * Contact List Items rendern (für Groups Sidebar)
     */
    renderContactListItems(contacts) {
        if (contacts.length === 0) {
            return '<div class="text-center text-tertiary text-sm p-4">Keine Kontakte</div>';
        }

        return contacts.map(contact => {
            const fullName = `${contact.fields.firstName || ''} ${contact.fields.lastName || ''}`.trim() || 'Unbenannt';
            const initials = this.getInitials(contact.fields.firstName, contact.fields.lastName);

            return `
                <div class="contact-list-item" data-contact-id="${contact.id}" draggable="true">
                    <div class="contact-list-item__avatar">${initials}</div>
                    <div class="contact-list-item__info">
                        <div class="contact-list-item__name">${this.escapeHtml(fullName)}</div>
                        ${contact.fields.email ? `
                            <div class="contact-list-item__email">${this.escapeHtml(contact.fields.email)}</div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Contact List Item Events (Drag)
     */
    attachContactListItemEvents() {
        document.querySelectorAll('.contact-list-item').forEach(item => {
            const contactId = item.dataset.contactId;
            if (contactId) {
                dragDropManager.makeDraggable(item, contactId);
            }
        });
    }

    /**
     * Group Cards rendern
     */
    renderGroupCards(groups) {
        return groups.map(group => {
            const members = groupService.getContacts(group.id);
            const memberCount = members.length;
            const displayMembers = members.slice(0, 5);
            const moreCount = Math.max(0, memberCount - 5);

            return `
                <div class="card group-card" data-group-id="${group.id}">
                    <div class="group-card__color-bar" style="background-color: var(--group-color-${group.color})"></div>

                    <div class="group-card__header">
                        <div class="group-card__name">${this.escapeHtml(group.name)}</div>
                        <div class="group-card__actions">
                            <button class="group-card__action-btn" title="Bearbeiten">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M11 1L15 5L5 15H1V11L11 1Z" stroke="currentColor" stroke-width="1.5"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    ${group.description ? `
                        <div class="group-card__description">${this.escapeHtml(group.description)}</div>
                    ` : ''}

                    <div class="group-card__members">
                        <div class="group-card__members-header">
                            <span class="group-card__members-count">
                                ${memberCount} ${memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
                            </span>
                        </div>

                        ${memberCount === 0 ? `
                            <div class="group-card__empty">
                                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                    <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Ziehen Sie Kontakte hierher
                            </div>
                        ` : `
                            <div class="group-card__avatar-stack">
                                ${displayMembers.map(member => {
                                    const initials = this.getInitials(member.fields.firstName, member.fields.lastName);
                                    return `<div class="group-card__avatar" title="${this.escapeHtml(member.fields.firstName)} ${this.escapeHtml(member.fields.lastName)}">${initials}</div>`;
                                }).join('')}
                                ${moreCount > 0 ? `
                                    <div class="group-card__avatar group-card__avatar--more" title="${moreCount} weitere">+${moreCount}</div>
                                ` : ''}
                            </div>
                        `}
                    </div>

                    <div class="group-card__drop-hint">
                        <div class="group-card__drop-hint-text">
                            Hier ablegen
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Events View
     */
    renderEventsView(container) {
        const events = eventService.list();
        const contacts = contactService.list();
        const groups = groupService.list();

        container.innerHTML = `
            <div class="groups-view-container">
                <!-- Sidebar mit Contacts & Groups -->
                <div class="groups-view__sidebar">
                    <div class="groups-view__sidebar-header">
                        <h3 class="text-base font-semibold">Teilnehmer</h3>
                    </div>

                    <!-- Kontakte -->
                    <div class="groups-view__sidebar-section">
                        <h4 class="sidebar-section-title">Kontakte (${contacts.length})</h4>
                        <div class="groups-view__sidebar-search">
                            <input
                                type="search"
                                class="input input--sm"
                                placeholder="Suche..."
                                id="eventsContactSearch"
                            />
                        </div>
                        <div class="groups-view__contacts" id="eventsContactsList">
                            ${this.renderContactListItems(contacts)}
                        </div>
                    </div>

                    <!-- Gruppen -->
                    <div class="groups-view__sidebar-section">
                        <h4 class="sidebar-section-title">Gruppen (${groups.length})</h4>
                        <div class="events-groups-list">
                            ${groups.map(group => `
                                <div class="sidebar-group-item" data-group-id="${group.id}" draggable="true">
                                    <div class="sidebar-group-dot" style="background-color: var(--group-color-${group.color})"></div>
                                    <div class="sidebar-group-info">
                                        <div class="sidebar-group-name">${this.escapeHtml(group.name)}</div>
                                        <div class="sidebar-group-count">${group.contactIds.length} Mitglieder</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Events Grid -->
                <div class="groups-view__main">
                    <div class="view-header flex items-center justify-between mb-6">
                        <div>
                            <h1 class="text-3xl font-semibold">Events</h1>
                            <p class="text-secondary mt-2">${events.length} ${events.length === 1 ? 'Event' : 'Events'}</p>
                        </div>
                        <button class="btn btn--primary" id="addEventBtn">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Event erstellen
                        </button>
                    </div>

                    <div class="contacts-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
                        ${events.length === 0 ? this.renderEmptyState('Events') : this.renderEventCards(events)}
                    </div>
                </div>
            </div>
        `;

        // Add Event Button
        document.getElementById('addEventBtn')?.addEventListener('click', () => new EventForm().open('create'));

        // Contact Search in Sidebar
        const contactSearch = document.getElementById('eventsContactSearch');
        if (contactSearch) {
            contactSearch.addEventListener('input', debounce((e) => {
                const query = e.target.value.toLowerCase();
                const contactsList = document.getElementById('eventsContactsList');
                const filtered = query ? contacts.filter(c => c.matchesSearch(query)) : contacts;
                contactsList.innerHTML = this.renderContactListItems(filtered);
                this.attachEventsContactListeners();
            }, 300));
        }

        // Contact List Items Drag Events
        this.attachEventsContactListeners();

        // Group Items Drag Events
        container.querySelectorAll('.sidebar-group-item').forEach(item => {
            const groupId = item.dataset.groupId;
            if (groupId) {
                dragDropManager.makeGroupDraggable(item, groupId);
            }
        });

        // Event Card Events
        container.querySelectorAll('.event-card').forEach(card => {
            const eventId = card.dataset.eventId;

            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                if (eventId) new EventDetail(eventId).open();
            });

            // Make Droppable für Drag & Drop
            if (eventId) {
                dragDropManager.makeEventDroppable(card, eventId);
            }

            card.style.cursor = 'pointer';
        });
    }

    /**
     * Attach Contact List Listeners für Events View
     */
    attachEventsContactListeners() {
        document.querySelectorAll('#eventsContactsList .contact-list-item').forEach(item => {
            const contactId = item.dataset.contactId;
            if (contactId) {
                dragDropManager.makeDraggable(item, contactId);
            }
        });
    }

    /**
     * Event Cards rendern
     */
    renderEventCards(events) {
        return events.map(event => {
            const attendeeCount = eventService.getAttendees(event.id).length;
            const isPast = event.isPast();
            const isToday = event.isToday();

            return `
                <div class="card event-card ${isPast ? 'event-card--past' : ''}" data-event-id="${event.id}">
                    <div class="event-card__date">
                        <div class="event-card__date-day">${new Date(event.eventDate).getDate()}</div>
                        <div class="event-card__date-month">${new Date(event.eventDate).toLocaleString('de-DE', { month: 'short' })}</div>
                    </div>

                    <div class="event-card__content">
                        <div class="event-card__header">
                            <h3 class="event-card__name">${this.escapeHtml(event.name)}</h3>
                            ${isToday ? '<span class="event-card__badge event-card__badge--today">Heute</span>' : ''}
                            ${isPast ? '<span class="event-card__badge event-card__badge--past">Vorbei</span>' : ''}
                        </div>

                        ${event.location ? `
                            <div class="event-card__location">
                                <svg width="14" height="14" fill="none"><path d="M7 1C5.34 1 4 2.34 4 4C4 6.5 7 10 7 10C7 10 10 6.5 10 4C10 2.34 8.66 1 7 1ZM7 5C6.45 5 6 4.55 6 4C6 3.45 6.45 3 7 3C7.55 3 8 3.45 8 4C8 4.55 7.55 5 7 5Z" fill="currentColor"/></svg>
                                ${this.escapeHtml(event.location)}
                            </div>
                        ` : ''}

                        ${event.description ? `
                            <div class="event-card__description">${this.escapeHtml(event.description)}</div>
                        ` : ''}

                        <div class="event-card__footer">
                            <div class="event-card__attendees">
                                <svg width="16" height="16" fill="none"><path d="M8 8C9.66 8 11 6.66 11 5C11 3.34 9.66 2 8 2C6.34 2 5 3.34 5 5C5 6.66 6.34 8 8 8ZM8 9.5C5.67 9.5 1 10.67 1 13V14H15V13C15 10.67 10.33 9.5 8 9.5Z" fill="currentColor"/></svg>
                                ${attendeeCount} ${attendeeCount === 1 ? 'Teilnehmer' : 'Teilnehmer'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Color Options für Settings rendern
     */
    renderColorOptions(currentColor) {
        const colors = [
            { name: 'sky', label: 'Sky Blue', hex: '#0ea5e9' },
            { name: 'blue', label: 'Blau', hex: '#3b82f6' },
            { name: 'indigo', label: 'Indigo', hex: '#6366f1' },
            { name: 'violet', label: 'Violett', hex: '#8b5cf6' },
            { name: 'purple', label: 'Lila', hex: '#a855f7' },
            { name: 'pink', label: 'Pink', hex: '#ec4899' },
            { name: 'rose', label: 'Rose', hex: '#f43f5e' },
            { name: 'red', label: 'Rot', hex: '#ef4444' },
            { name: 'orange', label: 'Orange', hex: '#f97316' },
            { name: 'amber', label: 'Bernstein', hex: '#f59e0b' },
            { name: 'green', label: 'Grün', hex: '#10b981' },
            { name: 'emerald', label: 'Smaragd', hex: '#059669' },
            { name: 'teal', label: 'Türkis', hex: '#14b8a6' },
            { name: 'cyan', label: 'Cyan', hex: '#06b6d4' }
        ];

        return colors.map(color => `
            <button
                class="color-option ${currentColor === color.name ? 'color-option--active' : ''}"
                data-color="${color.name}"
                data-hex="${color.hex}"
                title="${color.label}"
                style="--color: ${color.hex}"
            >
                <div class="color-option__circle"></div>
                ${currentColor === color.name ? `
                    <svg class="color-option__check" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M13 4L6 11L3 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                ` : ''}
            </button>
        `).join('');
    }

    /**
     * Settings View
     */
    renderSettingsView(container) {
        const settings = appState.getSettings();
        const isConnected = appState.isConnected();

        container.innerHTML = `
            <div class="view-container p-6">
                <h1 class="text-3xl font-semibold mb-6">Einstellungen</h1>

                <div class="card mb-6">
                    <h3 class="text-lg font-semibold mb-4">Darstellung</h3>

                    <div class="input-group mb-4">
                        <label class="input-label">Theme</label>
                        <select class="input select" id="themeSelect">
                            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Hell</option>
                            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dunkel</option>
                        </select>
                    </div>

                    <div class="input-group">
                        <label class="input-label">Akzentfarbe</label>
                        <div class="color-picker" id="colorPicker">
                            ${this.renderColorOptions(settings.accentColor || 'sky')}
                        </div>
                    </div>
                </div>

                <div class="card mb-6">
                    <h3 class="text-lg font-semibold mb-4">E-Mail</h3>
                    <div class="input-group">
                        <label class="input-label">Ihre E-Mail-Adresse</label>
                        <input
                            type="email"
                            class="input"
                            id="defaultEmailInput"
                            placeholder="ihre.email@example.com"
                            value="${settings.defaultEmail || ''}"
                        />
                        <small class="input-helper">
                            Diese E-Mail-Adresse wird als Empfänger verwendet, wenn Sie Gruppen oder Events per E-Mail kontaktieren (BCC).
                        </small>
                    </div>
                </div>

                <div class="card">
                    <h3 class="text-lg font-semibold mb-4">Speicherung</h3>
                    <div class="mb-4">
                        <div class="text-sm font-medium mb-2">Server-Verbindung:</div>
                        <div class="text-sm text-secondary">
                            ${isConnected
                                ? '✓ Verbunden - Daten werden automatisch gespeichert'
                                : '⚠ Nicht verbunden'}
                        </div>
                    </div>
                    <div class="text-sm text-tertiary">
                        Ihre Daten werden automatisch auf dem Server gespeichert.
                        Nutzen Sie den Speichern-Button in der Kopfzeile, um ein lokales Backup herunterzuladen.
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

        // Color Picker
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const colorName = btn.dataset.color;
                const colorHex = btn.dataset.hex;

                // Update CSS Custom Property
                document.documentElement.style.setProperty('--color-primary', colorHex);
                document.documentElement.style.setProperty('--color-primary-hover', this.adjustColorBrightness(colorHex, -20));

                // Save to settings
                appState.updateSettings({ accentColor: colorName });

                // Update active state
                document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('color-option--active'));
                btn.classList.add('color-option--active');

                showToast('Akzentfarbe geändert', 'success', 2000);
            });
        });

        // Default Email Input
        const emailInput = document.getElementById('defaultEmailInput');
        if (emailInput) {
            emailInput.addEventListener('blur', (e) => {
                const email = e.target.value.trim();
                appState.updateSettings({ defaultEmail: email });
                showToast('E-Mail-Adresse gespeichert', 'success', 2000);
            });

            // Save on Enter key
            emailInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    emailInput.blur();
                }
            });
        }
    }

    /**
     * Kontakte importieren (CSV oder vCard)
     */
    async importContacts() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.vcf,.vcard';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                let contacts = [];

                if (file.name.endsWith('.csv')) {
                    contacts = this.parseCSV(text);
                } else if (file.name.endsWith('.vcf') || file.name.endsWith('.vcard')) {
                    contacts = this.parseVCard(text);
                }

                if (contacts.length > 0) {
                    this.showGroupSelectionDialog(contacts);
                } else {
                    showToast('Keine Kontakte gefunden', 'warning');
                }
            } catch (error) {
                showToast('Fehler beim Importieren: ' + error.message, 'error');
            }
        };
        input.click();
    }

    /**
     * Gruppen-Auswahl-Dialog für CSV-Import
     */
    showGroupSelectionDialog(contacts) {
        const groups = groupService.list();
        const overlay = document.getElementById('modalOverlay');

        const dialogHTML = `
            <div class="modal">
                <div class="modal__header">
                    <h2 class="modal__title">Kontakte einer Gruppe zuweisen</h2>
                    <button class="modal__close" id="closeGroupDialog">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div class="modal__body">
                    <p class="text-sm text-secondary mb-4">${contacts.length} Kontakte importieren</p>

                    <div class="input-group">
                        <label class="input-label">Gruppe auswählen oder erstellen</label>
                        <select class="input select-fancy" id="groupSelect">
                            <option value="">Keine Gruppe (nur importieren)</option>
                            <option value="__new__">+ Neue Gruppe erstellen</option>
                            ${groups.map(g => `<option value="${g.id}">${g.name} (${g.contactIds.length})</option>`).join('')}
                        </select>
                    </div>

                    <div class="input-group" id="newGroupNameContainer" style="display: none;">
                        <label class="input-label">Name der neuen Gruppe</label>
                        <input type="text" class="input" id="newGroupName" placeholder="z.B. Importierte Kontakte">
                    </div>
                </div>
                <div class="modal__footer">
                    <button class="btn btn--ghost" id="cancelImportBtn">Abbrechen</button>
                    <button class="btn btn--primary" id="confirmImportBtn">Importieren</button>
                </div>
            </div>
        `;

        overlay.innerHTML = dialogHTML;
        overlay.classList.add('active');

        // Event Listeners
        document.getElementById('closeGroupDialog').addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.innerHTML = '';
            }, 200);
        });

        document.getElementById('cancelImportBtn').addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.innerHTML = '';
            }, 200);
        });

        document.getElementById('groupSelect').addEventListener('change', (e) => {
            const container = document.getElementById('newGroupNameContainer');
            container.style.display = e.target.value === '__new__' ? 'block' : 'none';
        });

        document.getElementById('confirmImportBtn').addEventListener('click', async () => {
            await this.performImport(contacts);
        });
    }

    /**
     * PLZ zu Ort auflösen (für Import) - GeoNames API
     */
    async lookupCityFromZip(zip) {
        try {
            if (!zip || zip.length !== 5 || !/^\d{5}$/.test(zip)) {
                return null;
            }

            const response = await fetch(
                `http://api.geonames.org/postalCodeSearchJSON?postalcode=${zip}&country=DE&username=tobiasschoch&maxRows=1`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.postalCodes && data.postalCodes.length > 0) {
                    return data.postalCodes[0].placeName;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Duplikat-Merge-Dialog anzeigen
     */
    showDuplicateMergeDialog(existingContact, newContactData, onMerge) {
        const overlay = document.getElementById('modalOverlay');

        const renderField = (label, existingValue, newValue, fieldName) => {
            const hasExisting = existingValue && existingValue.trim();
            const hasNew = newValue && newValue.trim();

            if (!hasExisting && !hasNew) return '';

            return `
                <div class="merge-field">
                    <label class="merge-field__label">${label}</label>
                    <div class="merge-field__options">
                        <label class="merge-option ${hasExisting ? '' : 'merge-option--empty'}">
                            <input type="radio" name="${fieldName}" value="existing" ${hasExisting ? 'checked' : ''} ${!hasExisting ? 'disabled' : ''}>
                            <div class="merge-option__content">
                                <span class="merge-option__badge">Behalten</span>
                                <span class="merge-option__value">${hasExisting ? existingValue : '(leer)'}</span>
                            </div>
                        </label>
                        <label class="merge-option ${hasNew ? '' : 'merge-option--empty'}">
                            <input type="radio" name="${fieldName}" value="new" ${!hasExisting && hasNew ? 'checked' : ''} ${!hasNew ? 'disabled' : ''}>
                            <div class="merge-option__content">
                                <span class="merge-option__badge merge-option__badge--new">Neu</span>
                                <span class="merge-option__value">${hasNew ? newValue : '(leer)'}</span>
                            </div>
                        </label>
                    </div>
                </div>
            `;
        };

        const dialogHTML = `
            <div class="modal modal--large">
                <div class="modal__header">
                    <h2 class="modal__title">Duplikat gefunden: ${existingContact.getFullName()}</h2>
                    <button class="modal__close" id="closeMergeDialog">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div class="modal__body" style="max-height: 70vh; overflow-y: auto;">
                    <p class="text-sm text-secondary mb-6">Wähle für jedes Feld, welchen Wert du behalten möchtest:</p>

                    <form id="mergeForm">
                        ${renderField('Vorname', existingContact.fields.firstName, newContactData.fields?.firstName, 'firstName')}
                        ${renderField('Nachname', existingContact.fields.lastName, newContactData.fields?.lastName, 'lastName')}
                        ${renderField('Anrede',
                            existingContact.fields.gender === 'male' ? 'Herr' : existingContact.fields.gender === 'female' ? 'Frau' : existingContact.fields.gender === 'diverse' ? 'Divers' : '',
                            newContactData.fields?.gender === 'male' ? 'Herr' : newContactData.fields?.gender === 'female' ? 'Frau' : newContactData.fields?.gender === 'diverse' ? 'Divers' : '',
                            'gender'
                        )}
                        ${renderField('Titel', existingContact.fields.title, newContactData.fields?.title, 'title')}
                        ${renderField('Briefanrede', existingContact.fields.salutation, newContactData.fields?.salutation, 'salutation')}
                        ${renderField('E-Mail', existingContact.fields.email, newContactData.fields?.email, 'email')}
                        ${renderField('Telefon', existingContact.fields.phone, newContactData.fields?.phone, 'phone')}
                        ${renderField('Mobil', existingContact.fields.mobile, newContactData.fields?.mobile, 'mobile')}
                        ${renderField('Straße', existingContact.fields.address?.street, newContactData.fields?.address?.street, 'street')}
                        ${renderField('PLZ', existingContact.fields.address?.zip, newContactData.fields?.address?.zip, 'zip')}
                        ${renderField('Ort', existingContact.fields.address?.city, newContactData.fields?.address?.city, 'city')}
                        ${renderField('Land', existingContact.fields.address?.country, newContactData.fields?.address?.country, 'country')}
                        ${renderField('Notizen', existingContact.fields.notes, newContactData.fields?.notes, 'notes')}
                    </form>
                </div>
                <div class="modal__footer">
                    <button class="btn btn--ghost" id="skipMergeBtn">Überspringen</button>
                    <button class="btn btn--primary" id="confirmMergeBtn">Zusammenführen</button>
                </div>
            </div>
        `;

        overlay.innerHTML = dialogHTML;
        overlay.classList.add('active');

        // Event Listeners
        const closeDialog = (mergedData) => {
            overlay.classList.remove('active');
            overlay.innerHTML = '';
            onMerge(mergedData);
        };

        document.getElementById('closeMergeDialog').addEventListener('click', () => {
            closeDialog(null);
        });

        document.getElementById('skipMergeBtn').addEventListener('click', () => {
            closeDialog(null);
        });

        document.getElementById('confirmMergeBtn').addEventListener('click', () => {
            const form = document.getElementById('mergeForm');
            const formData = new FormData(form);

            const mergedData = {
                fields: {
                    address: {}
                }
            };

            // Gender mapping
            const genderMap = {
                'Herr': 'male',
                'Frau': 'female',
                'Divers': 'diverse'
            };

            // Collect selected values
            for (let [fieldName, choice] of formData.entries()) {
                const source = choice === 'existing' ? existingContact : newContactData;

                if (fieldName === 'gender') {
                    const genderValue = choice === 'existing' ? existingContact.fields.gender : newContactData.fields?.gender;
                    mergedData.fields.gender = genderValue;
                } else if (['street', 'zip', 'city', 'country'].includes(fieldName)) {
                    const value = choice === 'existing'
                        ? existingContact.fields.address?.[fieldName]
                        : newContactData.fields?.address?.[fieldName];
                    if (value) mergedData.fields.address[fieldName] = value;
                } else {
                    const value = choice === 'existing'
                        ? existingContact.fields[fieldName]
                        : newContactData.fields?.[fieldName];
                    if (value) mergedData.fields[fieldName] = value;
                }
            }

            closeDialog(mergedData);
        });
    }

    /**
     * Import durchführen mit Duplikat-Prüfung
     */
    async performImport(contacts, skipGroupDialog = false) {
        let groupId = null;

        if (!skipGroupDialog) {
            const groupSelect = document.getElementById('groupSelect')?.value;
            const newGroupName = document.getElementById('newGroupName')?.value;

            try {
                // Neue Gruppe erstellen, falls gewünscht
                if (groupSelect === '__new__') {
                    if (!newGroupName || !newGroupName.trim()) {
                        showToast('Bitte Gruppennamen eingeben', 'error');
                        return;
                    }
                    const newGroup = groupService.create({ name: newGroupName.trim() });
                    groupId = newGroup.id;
                } else if (groupSelect) {
                    groupId = groupSelect;
                }
            } catch (error) {
                showToast('Fehler bei Gruppenwahl: ' + error.message, 'error');
                return;
            }
        }

        try {
            // PLZ zu Ort auflösen für alle Kontakte
            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];
                const zip = contact.fields?.address?.zip;
                if (zip) {
                    const city = await this.lookupCityFromZip(zip);
                    if (city) {
                        contact.fields.address.city = city;
                    }
                }
            }

            // Kontakte importieren mit Duplikat-Prüfung und Merge
            const imported = [];
            const merged = [];
            const skipped = [];

            for (let i = 0; i < contacts.length; i++) {
                const contactData = contacts[i];

                // Prüfe auf Duplikate - ALLE finden, nicht nur den ersten
                const existingContacts = appState.getContacts();
                const nameMatches = existingContacts.filter(c =>
                    c.fields.firstName?.toLowerCase() === contactData.fields?.firstName?.toLowerCase() &&
                    c.fields.lastName?.toLowerCase() === contactData.fields?.lastName?.toLowerCase()
                );

                const emailMatches = contactData.fields?.email
                    ? existingContacts.filter(c =>
                        c.fields.email?.toLowerCase() === contactData.fields?.email?.toLowerCase()
                    )
                    : [];

                // Alle Duplikate zusammenführen und deduplizieren
                const allMatches = [...nameMatches, ...emailMatches];
                const uniqueMatches = [...new Map(allMatches.map(c => [c.id, c])).values()];

                if (uniqueMatches.length > 0) {
                    // Wenn mehrere Duplikate: Zeige Info
                    if (uniqueMatches.length > 1) {
                        console.warn(`⚠️ ${uniqueMatches.length} Duplikate gefunden für ${contactData.fields?.firstName} ${contactData.fields?.lastName}`);
                    }

                    // Merge mit dem ersten/besten Match
                    const existingContact = uniqueMatches[0];
                    // Duplikat gefunden - Merge-Dialog anzeigen
                    const existingContactObj = contactService.get(existingContact.id);
                    const mergedData = await new Promise((resolve) => {
                        this.showDuplicateMergeDialog(
                            existingContactObj,
                            contactData,
                            resolve
                        );
                    });

                    if (mergedData) {
                        // User hat Felder ausgewählt - Kontakt updaten
                        try {
                            // Temporär: E-Mail-Duplikat-Check umgehen durch direktes Entfernen der E-Mail bei anderen Duplikaten
                            if (mergedData.fields?.email && uniqueMatches.length > 1) {
                                // Entferne E-Mail von allen anderen Duplikaten
                                for (const match of uniqueMatches) {
                                    if (match.id !== existingContact.id &&
                                        match.fields.email?.toLowerCase() === mergedData.fields?.email?.toLowerCase()) {
                                        await contactService.update(match.id, {
                                            fields: { email: '' }
                                        });
                                        console.log(`🔄 E-Mail von Duplikat ${match.fields.firstName} ${match.fields.lastName} entfernt`);
                                    }
                                }
                            }

                            await contactService.update(existingContact.id, mergedData);
                            merged.push(existingContact.id);
                            imported.push(existingContact.id);
                        } catch (error) {
                            console.error('❌ Fehler beim Update:', error);
                            skipped.push(`${contactData.fields?.firstName} ${contactData.fields?.lastName}: ${error.message}`);
                        }
                    } else {
                        // User hat übersprungen
                        console.log('⏭️ Kontakt übersprungen (mergedData ist null):', contactData.fields?.firstName, contactData.fields?.lastName);
                        skipped.push(`${contactData.fields?.firstName} ${contactData.fields?.lastName}`);
                    }
                } else {
                    // Kein Duplikat - normal importieren
                    try {
                        const contact = await contactService.create(contactData);
                        imported.push(contact.id);
                    } catch (error) {
                        skipped.push(`${contactData.fields?.firstName} ${contactData.fields?.lastName}: ${error.message}`);
                    }
                }
            }

            // Kontakte zur Gruppe hinzufügen (nur wenn nicht bereits Mitglied)
            if (groupId && imported.length > 0) {
                const group = groupService.get(groupId);
                for (const contactId of imported) {
                    // Nur hinzufügen wenn nicht bereits in der Gruppe
                    if (!group.contactIds.includes(contactId)) {
                        await contactService.addToGroup(contactId, groupId);
                    }
                }
            }

            // Dialog schließen
            const overlay = document.getElementById('modalOverlay');
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.innerHTML = '';
            }, 200);

            // Ergebnis anzeigen
            const newImports = imported.length - merged.length;
            if (imported.length > 0) {
                const groupName = groupId ? groupService.get(groupId).name : '';
                let message = '';

                if (newImports > 0 && merged.length > 0) {
                    const newText = newImports === 1 ? '1 neuer' : `${newImports} neue`;
                    const mergedText = merged.length === 1 ? '1 aktualisiert' : `${merged.length} aktualisiert`;
                    message = groupId
                        ? `${newText}, ${mergedText} in "${groupName}"`
                        : `${newText}, ${mergedText}`;
                } else if (merged.length > 0) {
                    const kontaktText = merged.length === 1 ? 'Kontakt' : 'Kontakte';
                    message = groupId
                        ? `${merged.length} ${kontaktText} aktualisiert in "${groupName}"`
                        : `${merged.length} ${kontaktText} aktualisiert`;
                } else {
                    const kontaktText = newImports === 1 ? 'Kontakt' : 'Kontakte';
                    message = groupId
                        ? `${newImports} ${kontaktText} in "${groupName}" importiert`
                        : `${newImports} ${kontaktText} importiert`;
                }

                showToast(message, 'success');
            }

            if (skipped.length > 0) {
                const kontaktText = skipped.length === 1 ? 'Kontakt' : 'Kontakte';
                showToast(`${skipped.length} ${kontaktText} übersprungen`, 'warning');
            }

            this.renderView('contacts');
            this.updateCounters();

        } catch (error) {
            showToast('Fehler beim Importieren: ' + error.message, 'error');
        }
    }

    /**
     * CSV parsen (unterstützt mehrere Formate)
     */
    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        // Trennzeichen erkennen und Zeilen splitten
        const firstLine = lines[0];
        let headers, allValues;

        if (firstLine.includes(';')) {
            // Semikolon-getrennt (Standard deutsches CSV)
            headers = firstLine.split(';').map(h => h.trim());
            allValues = lines.slice(1).map(line => line.split(';').map(v => v.trim()));
        } else if (firstLine.includes('\t')) {
            // Tab-getrennt
            headers = firstLine.split('\t').map(h => h.trim());
            allValues = lines.slice(1).map(line => line.split('\t').map(v => v.trim()));
        } else if (firstLine.includes(',')) {
            // Komma-getrennt
            headers = firstLine.split(',').map(h => h.trim());
            allValues = lines.slice(1).map(line => line.split(',').map(v => v.trim()));
        } else {
            // Mehrere Leerzeichen als Trenner
            headers = firstLine.split(/\s{2,}/).map(h => h.trim());
            allValues = lines.slice(1).map(line => line.split(/\s{2,}/).map(v => v.trim()));
        }

        const contacts = [];

        // Prüfen, ob sowohl Anrede als auch Briefanrede vorhanden sind
        const hasBriefanrede = headers.includes('Briefanrede');
        const hasAnrede = headers.includes('Anrede');

        for (let i = 0; i < allValues.length; i++) {
            const values = allValues[i];
            const contact = {
                fields: {
                    address: {}
                }
            };

            headers.forEach((header, index) => {
                const value = values[index]?.trim() || '';

                // Leere Header überspringen
                if (!header || !header.trim()) return;

                // Mapping der Spalten (alle Formate)
                // Format 1 & 2: Nachname/Vorname
                if (header === 'Nachname' && value) contact.fields.lastName = value;
                else if (header === 'Vorname' && value) contact.fields.firstName = value;

                // Format 3: Name/Vorname
                else if (header === 'Name' && value) contact.fields.lastName = value;

                // Adress-Felder
                else if (header === 'ZustellStrasse' && value) contact.fields.address.street = value;
                else if (header === 'ZustellStraße' && value) contact.fields.address.street = value;
                else if (header === 'Strasse' && value) contact.fields.address.street = value;
                else if (header === 'Straße' && value) contact.fields.address.street = value;
                else if (header === 'ZustellPLZ' && value) contact.fields.address.zip = value;
                else if (header === 'PLZ' && value) contact.fields.address.zip = value;
                else if (header === 'ZustellOrt' && value) contact.fields.address.city = value;
                else if (header === 'Ort' && value) contact.fields.address.city = value;

                // Weitere Felder
                else if (header === 'Titel' && value) contact.fields.title = value;
                else if (header === 'E-Mail1' && value) contact.fields.email = value;
                else if (header === 'Mail' && value) contact.fields.email = value;
                else if (header === 'Geburtstag' && value) contact.fields.birthday = value;
                else if (header === 'Telefon' && value) contact.fields.phone = value;
                else if (header === 'Briefanrede' && value) {
                    contact.fields.salutation = value;
                    // Gender aus Briefanrede extrahieren
                    const lowerValue = value.toLowerCase();
                    if (lowerValue.includes('herr')) {
                        contact.fields.gender = 'male';
                    } else if (lowerValue.includes('frau')) {
                        contact.fields.gender = 'female';
                    } else {
                        contact.fields.gender = 'diverse';
                    }
                }
                else if (header === 'Anrede' && value && !hasBriefanrede) {
                    // Anrede nur als Gender mappen, wenn keine Briefanrede vorhanden
                    const lowerValue = value.toLowerCase();
                    if (lowerValue.includes('herr')) {
                        contact.fields.gender = 'male';
                    } else if (lowerValue.includes('frau')) {
                        contact.fields.gender = 'female';
                    } else {
                        contact.fields.gender = 'diverse';
                    }
                }
            });

            // Nur hinzufügen wenn mindestens Name vorhanden
            if (contact.fields.firstName || contact.fields.lastName) {
                contacts.push(contact);
            }
        }

        return contacts;
    }

    /**
     * vCard/Outlook-Kontakt parsen
     */
    parseVCard(text) {
        const contacts = [];
        const vcards = text.split('BEGIN:VCARD');

        for (let i = 1; i < vcards.length; i++) {
            const vcard = vcards[i];
            const contact = {};

            // Name parsen (N:Nachname;Vorname)
            const nameMatch = vcard.match(/N:([^;]*);([^;\r\n]*)/);
            if (nameMatch) {
                contact.lastName = nameMatch[1].trim();
                contact.firstName = nameMatch[2].trim();
            }

            // Email parsen
            const emailMatch = vcard.match(/EMAIL[^:]*:([^\r\n]+)/);
            if (emailMatch) {
                contact.email = emailMatch[1].trim();
            }

            // Telefon parsen
            const telMatch = vcard.match(/TEL[^:]*:([^\r\n]+)/);
            if (telMatch) {
                contact.phone = telMatch[1].trim();
            }

            // Adresse parsen (ADR:;;Straße;Ort;;PLZ;Land)
            const adrMatch = vcard.match(/ADR[^:]*:;;([^;]*);([^;]*);[^;]*;([^;]*);([^\r\n]*)/);
            if (adrMatch) {
                contact.street = adrMatch[1].trim();
                contact.city = adrMatch[2].trim();
                contact.zip = adrMatch[3].trim();
                contact.country = adrMatch[4].trim();
            }

            // Nur hinzufügen wenn mindestens Name vorhanden
            if (contact.firstName || contact.lastName) {
                contacts.push(contact);
            }
        }

        return contacts;
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

    /**
     * Adjust Color Brightness (für Hover-Effekte)
     */
    adjustColorBrightness(hex, percent) {
        // Hex zu RGB
        const num = parseInt(hex.replace('#', ''), 16);
        const r = (num >> 16) + percent;
        const g = ((num >> 8) & 0x00FF) + percent;
        const b = (num & 0x0000FF) + percent;

        // Clamp values
        const newR = Math.min(255, Math.max(0, r));
        const newG = Math.min(255, Math.max(0, g));
        const newB = Math.min(255, Math.max(0, b));

        // RGB zu Hex
        return '#' + ((newR << 16) | (newG << 8) | newB).toString(16).padStart(6, '0');
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
