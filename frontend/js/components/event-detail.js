/**
 * Event Detail View Component
 */

import eventService from '../services/event-service.js';
import groupService from '../services/group-service.js';
import csvExportService from '../services/csv-export-service.js';
import appState from '../state/app-state.js';
import { showToast, copyToClipboard, formatDate } from '../utils/helpers.js';
import { EventForm } from './event-form.js';

export class EventDetail {
    constructor(eventId) {
        this.eventId = eventId;
        this.event = null;
        this.panelElement = null;
    }

    open() {
        this.event = eventService.get(this.eventId);
        if (!this.event) {
            showToast('Event nicht gefunden', 'error');
            return;
        }
        this.render();
        this.attachEventListeners();
    }

    close() {
        if (this.panelElement) {
            this.destroy(); // Event Listeners aufräumen
            this.panelElement.style.animation = 'slideOutRight 250ms ease-out forwards';
            setTimeout(() => {
                this.panelElement?.remove();
                this.panelElement = null;
            }, 250);
        }
    }

    render() {
        const existing = document.querySelector('.event-detail-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.className = 'contact-detail-panel event-detail-panel';
        panel.innerHTML = this.renderContent();
        document.body.appendChild(panel);
        this.panelElement = panel;
        setTimeout(() => panel.style.transform = 'translateX(0)', 10);
    }

    renderContent() {
        const event = this.event;
        const attendees = eventService.getAttendees(this.eventId);
        const emailAddresses = eventService.getEmailAddresses(this.eventId);
        const groups = groupService.list().filter(g => event.attendees.groupIds.includes(g.id));
        const individualContacts = appState.getContacts().filter(c =>
            event.attendees.contactIds.includes(c.id)
        );

        return `
            <div class="contact-detail__header">
                <button class="icon-button" id="closeDetailBtn">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                <h2 class="contact-detail__title">Event Details</h2>
                <div class="contact-detail__actions">
                    <button class="icon-button" id="editEventBtn" title="Bearbeiten">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M14 2L18 6L7 17H3V13L14 2Z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="icon-button" id="deleteEventBtn" title="Löschen">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M3 5H17M8 5V3H12V5M8 9V15M12 9V15M5 5L6 17H14L15 5H5Z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="contact-detail__body">
                <h3 class="contact-detail__name">${this.escapeHtml(event.name)}</h3>

                <div class="event-detail__meta">
                    <div class="event-detail__meta-item">
                        <svg width="16" height="16" fill="none"><path d="M13 2H12V1H11V2H5V1H4V2H3C2.45 2 2 2.45 2 3V13C2 13.55 2.45 14 3 14H13C13.55 14 14 13.55 14 13V3C14 2.45 13.55 2 13 2ZM13 13H3V5H13V13Z" fill="currentColor"/></svg>
                        ${formatDate(event.eventDate, 'long')}
                    </div>
                    ${event.location ? `
                        <div class="event-detail__meta-item">
                            <svg width="16" height="16" fill="none"><path d="M8 1C5.79 1 4 2.79 4 5C4 8.5 8 13 8 13C8 13 12 8.5 12 5C12 2.79 10.21 1 8 1ZM8 6.5C7.17 6.5 6.5 5.83 6.5 5C6.5 4.17 7.17 3.5 8 3.5C8.83 3.5 9.5 4.17 9.5 5C9.5 5.83 8.83 6.5 8 6.5Z" fill="currentColor"/></svg>
                            ${this.escapeHtml(event.location)}
                        </div>
                    ` : ''}
                </div>

                ${event.description ? `
                    <div class="contact-detail__section">
                        <h4 class="contact-detail__section-title">Beschreibung</h4>
                        <p class="text-sm text-secondary">${this.escapeHtml(event.description)}</p>
                    </div>
                ` : ''}

                <div class="contact-detail__section">
                    <div class="group-detail__stats">
                        <div class="group-detail__stat">
                            <div class="group-detail__stat-value">${attendees.length}</div>
                            <div class="group-detail__stat-label">Teilnehmer</div>
                        </div>
                        <div class="group-detail__stat">
                            <div class="group-detail__stat-value">${emailAddresses.length}</div>
                            <div class="group-detail__stat-label">Emails</div>
                        </div>
                    </div>
                </div>

                ${emailAddresses.length > 0 ? `
                    <div class="contact-detail__section">
                        <button class="btn btn--primary w-full" id="emailAllBtn">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M2 4L10 9L18 4M2 4V14H18V4H2Z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Alle per E-Mail kontaktieren
                        </button>
                        <button class="btn btn--secondary w-full mt-2" id="downloadMailMergeBtn">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M10 3V15M10 15L15 10M10 15L5 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M3 17H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Serienbrief Herunterladen
                        </button>
                    </div>
                ` : ''}

                ${groups.length > 0 || individualContacts.length > 0 ? `
                    <div class="event-detail__attendees-container">
                        ${groups.length > 0 ? `
                            <div class="event-detail__section-half">
                                <h4 class="contact-detail__section-title">Gruppen</h4>
                                <div class="event-detail__groups-list">
                                    ${groups.map(group => `
                                        <div class="group-badge" style="border-left-color: var(--group-color-${group.color})">
                                            ${this.escapeHtml(group.name)} (${group.contactIds.length})
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${individualContacts.length > 0 ? `
                            <div class="event-detail__section-half">
                                <h4 class="contact-detail__section-title">Einzelne Teilnehmer</h4>
                                <div class="event-detail__members-list">
                                    ${individualContacts.map(contact => {
                                        const fullName = `${contact.fields.firstName || ''} ${contact.fields.lastName || ''}`.trim();
                                        return `
                                            <div class="group-detail__member">
                                                <div class="group-detail__member-info">
                                                    <div class="group-detail__member-name">${this.escapeHtml(fullName)}</div>
                                                    ${contact.fields.email ? `<div class="group-detail__member-email">${this.escapeHtml(contact.fields.email)}</div>` : ''}
                                                </div>
                                                ${contact.fields.email ? `
                                                    <button class="icon-button icon-button--sm" data-copy-email="${this.escapeHtml(contact.fields.email)}">
                                                        <svg width="16" height="16" fill="none"><path d="M5 5V2H13V10H10M1 6H9V14H1V6Z" stroke="currentColor" stroke-width="1.5"/></svg>
                                                    </button>
                                                ` : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    attachEventListeners() {
        this.panelElement.querySelector('#closeDetailBtn')?.addEventListener('click', () => this.close());
        this.panelElement.querySelector('#editEventBtn')?.addEventListener('click', () => {
            this.close();
            new EventForm().open('edit', this.eventId);
        });
        this.panelElement.querySelector('#deleteEventBtn')?.addEventListener('click', () => this.handleDelete());
        this.panelElement.querySelector('#emailAllBtn')?.addEventListener('click', () => {
            try {
                const mailto = eventService.getMailtoLink(this.eventId, appState.getSettings().defaultEmail);
                window.location.href = mailto;
            } catch (error) {
                showToast(error.message, 'error');
            }
        });

        this.panelElement.querySelector('#downloadMailMergeBtn')?.addEventListener('click', () => {
            this.handleDownloadMailMerge();
        });

        this.panelElement.querySelectorAll('[data-copy-email]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(btn.dataset.copyEmail);
            });
        });

        this.escapeHandler = (e) => e.key === 'Escape' && this.close();
        document.addEventListener('keydown', this.escapeHandler);

        // Click außerhalb des Panels
        this.clickOutsideHandler = (e) => {
            if (this.panelElement && !this.panelElement.contains(e.target)) {
                this.close();
            }
        };
        // Delay um zu verhindern, dass der Click der das Panel öffnet es sofort wieder schließt
        setTimeout(() => {
            document.addEventListener('click', this.clickOutsideHandler);
        }, 100);
    }

    async handleDelete() {
        if (confirm(`Event "${this.event.name}" wirklich löschen?`)) {
            try {
                await eventService.delete(this.eventId);
                showToast('Event gelöscht', 'success');
                this.close();
                appState.emit('events:changed');
            } catch (error) {
                showToast('Fehler beim Löschen', 'error');
            }
        }
    }

    handleDownloadMailMerge() {
        try {
            const attendees = eventService.getAttendees(this.eventId);
            if (attendees.length === 0) {
                showToast('Keine Teilnehmer bei diesem Event', 'warning');
                return;
            }

            csvExportService.exportForMailMerge(attendees);
            showToast(`CSV für ${attendees.length} Teilnehmer exportiert`, 'success');
        } catch (error) {
            console.error('Fehler beim Exportieren:', error);
            showToast(error.message || 'Fehler beim Exportieren', 'error');
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
        }
    }
}
