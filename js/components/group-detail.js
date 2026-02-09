/**
 * Group Detail View Component
 */

import groupService from '../services/group-service.js';
import csvExportService from '../services/csv-export-service.js';
import appState from '../state/app-state.js';
import { showToast, copyToClipboard } from '../utils/helpers.js';
import { GroupForm } from './group-form.js';
import { ContactDetail } from './contact-detail.js';

export class GroupDetail {
    constructor(groupId) {
        this.groupId = groupId;
        this.group = null;
        this.panelElement = null;
    }

    /**
     * Panel öffnen
     */
    open() {
        this.group = groupService.get(this.groupId);

        if (!this.group) {
            showToast('Gruppe nicht gefunden', 'error');
            return;
        }

        this.render();
        this.attachEventListeners();
    }

    /**
     * Panel schließen
     */
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

    /**
     * Panel rendern
     */
    render() {
        // Bestehende Panel entfernen
        const existing = document.querySelector('.group-detail-panel');
        if (existing) {
            existing.remove();
        }

        const panel = document.createElement('div');
        panel.className = 'contact-detail-panel group-detail-panel';
        panel.innerHTML = this.renderContent();

        document.body.appendChild(panel);
        this.panelElement = panel;

        // Animation starten
        setTimeout(() => {
            panel.style.transform = 'translateX(0)';
        }, 10);
    }

    /**
     * Content rendern
     */
    renderContent() {
        const group = this.group;
        const contacts = groupService.getContacts(this.groupId);
        const emailAddresses = groupService.getEmailAddresses(this.groupId);

        return `
            <div class="contact-detail__header">
                <button class="icon-button" id="closeDetailBtn" aria-label="Schließen">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                <h2 class="contact-detail__title">Gruppe Details</h2>
                <div class="contact-detail__actions">
                    <button class="icon-button" id="editGroupBtn" aria-label="Bearbeiten" title="Bearbeiten">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M14 2L18 6L7 17H3V13L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="icon-button" id="deleteGroupBtn" aria-label="Löschen" title="Löschen">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M3 5H17M8 5V3H12V5M8 9V15M12 9V15M5 5L6 17H14L15 5H5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="contact-detail__body">
                <div
                    class="group-detail__color-badge"
                    style="background-color: var(--group-color-${group.color})"
                ></div>

                <h3 class="contact-detail__name">${this.escapeHtml(group.name)}</h3>

                ${group.description ? `
                    <div class="contact-detail__company">${this.escapeHtml(group.description)}</div>
                ` : ''}

                <div class="contact-detail__section">
                    <div class="group-detail__stats">
                        <div class="group-detail__stat">
                            <div class="group-detail__stat-value">${contacts.length}</div>
                            <div class="group-detail__stat-label">${contacts.length === 1 ? 'Mitglied' : 'Mitglieder'}</div>
                        </div>
                        <div class="group-detail__stat">
                            <div class="group-detail__stat-value">${emailAddresses.length}</div>
                            <div class="group-detail__stat-label">Email${emailAddresses.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>

                ${emailAddresses.length > 0 ? `
                    <div class="contact-detail__section">
                        <button class="btn btn--primary w-full" id="emailAllBtn">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M2 4L10 9L18 4M2 4V14H18V4H2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Alle per E-Mail kontaktieren (BCC)
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

                <div class="contact-detail__section">
                    <h4 class="contact-detail__section-title">Mitglieder</h4>
                    ${contacts.length === 0 ? `
                        <div class="group-detail__empty">
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2" opacity="0.2"/>
                            </svg>
                            <p class="text-secondary text-sm">Noch keine Mitglieder</p>
                            <p class="text-tertiary text-xs mt-2">Ziehen Sie Kontakte hierher</p>
                        </div>
                    ` : `
                        <div class="group-detail__members">
                            ${contacts.map(contact => {
                                const fullName = `${contact.fields.firstName || ''} ${contact.fields.lastName || ''}`.trim() || 'Unbenannt';
                                return `
                                    <div class="group-detail__member" data-contact-id="${contact.id}">
                                        <div class="group-detail__member-info">
                                            <div class="group-detail__member-name">${this.escapeHtml(fullName)}</div>
                                            ${contact.fields.email ? `
                                                <div class="group-detail__member-email">
                                                    ${this.escapeHtml(contact.fields.email)}
                                                </div>
                                            ` : ''}
                                        </div>
                                        <div class="group-detail__member-actions">
                                            ${contact.fields.email ? `
                                                <button
                                                    class="icon-button icon-button--sm"
                                                    data-copy-email="${this.escapeHtml(contact.fields.email)}"
                                                    title="Email kopieren"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M5 5V2H13V10H10M1 6H9V14H1V6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                                    </svg>
                                                </button>
                                            ` : ''}
                                            <button
                                                class="icon-button icon-button--sm"
                                                data-remove-contact="${contact.id}"
                                                title="Aus Gruppe entfernen"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    /**
     * Event Listeners
     */
    attachEventListeners() {
        // Alte globale Listener entfernen, falls vorhanden
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
        }

        // Close
        const closeBtn = this.panelElement.querySelector('#closeDetailBtn');
        closeBtn?.addEventListener('click', () => this.close());

        // Edit
        const editBtn = this.panelElement.querySelector('#editGroupBtn');
        editBtn?.addEventListener('click', () => {
            this.close();
            const form = new GroupForm();
            form.open('edit', this.groupId);
        });

        // Delete
        const deleteBtn = this.panelElement.querySelector('#deleteGroupBtn');
        deleteBtn?.addEventListener('click', () => this.handleDelete());

        // Email All
        const emailAllBtn = this.panelElement.querySelector('#emailAllBtn');
        emailAllBtn?.addEventListener('click', () => this.handleEmailAll());

        // Download Mail Merge
        const downloadMailMergeBtn = this.panelElement.querySelector('#downloadMailMergeBtn');
        downloadMailMergeBtn?.addEventListener('click', () => this.handleDownloadMailMerge());

        // Copy Email buttons
        this.panelElement.querySelectorAll('[data-copy-email]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const email = btn.dataset.copyEmail;
                copyToClipboard(email);
            });
        });

        // Remove Contact buttons
        this.panelElement.querySelectorAll('[data-remove-contact]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactId = btn.dataset.removeContact;
                this.handleRemoveContact(contactId);
            });
        });

        // Member Click (öffnet Contact Detail)
        this.panelElement.querySelectorAll('.group-detail__member').forEach(memberEl => {
            memberEl.addEventListener('click', () => {
                const contactId = memberEl.dataset.contactId;
                if (contactId) {
                    this.close();
                    const detail = new ContactDetail(contactId);
                    detail.open();
                }
            });
        });

        // ESC Key
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
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

    /**
     * Delete Handler
     */
    async handleDelete() {
        const confirmed = confirm(`Gruppe "${this.group.name}" wirklich löschen?`);

        if (confirmed) {
            try {
                groupService.delete(this.groupId);
                showToast('Gruppe gelöscht', 'success');
                this.close();
                appState.emit('groups:changed');
            } catch (error) {
                console.error('Fehler beim Löschen:', error);
                showToast('Fehler beim Löschen', 'error');
            }
        }
    }

    /**
     * Email All Handler
     */
    handleEmailAll() {
        try {
            const defaultEmail = appState.getSettings().defaultEmail || '';
            const mailtoLink = groupService.getMailtoLink(this.groupId, defaultEmail);
            window.location.href = mailtoLink;
        } catch (error) {
            console.error('Fehler beim Öffnen des Email-Clients:', error);
            showToast(error.message || 'Fehler beim Öffnen des Email-Clients', 'error');
        }
    }

    /**
     * Download Mail Merge Handler
     */
    handleDownloadMailMerge() {
        try {
            const contacts = groupService.getContacts(this.groupId);
            if (contacts.length === 0) {
                showToast('Keine Kontakte in dieser Gruppe', 'warning');
                return;
            }

            csvExportService.exportForMailMerge(contacts);
            showToast(`CSV für ${contacts.length} Kontakte exportiert`, 'success');
        } catch (error) {
            console.error('Fehler beim Exportieren:', error);
            showToast(error.message || 'Fehler beim Exportieren', 'error');
        }
    }

    /**
     * Remove Contact Handler
     */
    handleRemoveContact(contactId) {
        try {
            groupService.removeContact(this.groupId, contactId);
            showToast('Kontakt entfernt', 'success');

            // Re-render
            this.group = groupService.get(this.groupId);
            const body = this.panelElement.querySelector('.contact-detail__body');
            body.innerHTML = this.renderContent().match(/<div class="contact-detail__body">([\s\S]*)<\/div>$/)[1];
            this.attachEventListeners();

            appState.emit('groups:changed');
        } catch (error) {
            console.error('Fehler beim Entfernen:', error);
            showToast('Fehler beim Entfernen', 'error');
        }
    }

    /**
     * Helper: Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
        }
    }
}
