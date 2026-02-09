/**
 * Drag & Drop Manager
 * Verwaltet das Drag & Drop System für Contacts → Groups
 */

import groupService from '../services/group-service.js';
import appState from '../state/app-state.js';
import { showToast } from './helpers.js';

class DragDropManager {
    constructor() {
        this.draggedContactIds = new Set();
        this.isDragging = false;
        this.dragGhost = null;
    }

    /**
     * Contact-Cards als draggable machen
     */
    makeDraggable(element, contactId) {
        element.setAttribute('draggable', 'true');
        element.classList.add('draggable');

        element.addEventListener('dragstart', (e) => this.handleDragStart(e, contactId));
        element.addEventListener('dragend', (e) => this.handleDragEnd(e));
    }

    /**
     * Group-Cards als drop-zones machen
     */
    makeDroppable(element, groupId) {
        element.classList.add('drop-zone');

        element.addEventListener('dragover', (e) => this.handleDragOver(e, groupId));
        element.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        element.addEventListener('drop', (e) => this.handleDrop(e, groupId));
    }

    /**
     * Drag Start Handler
     */
    handleDragStart(e, contactId) {
        this.isDragging = true;

        // Wenn Contact bereits selected ist, drag alle selected
        // Sonst nur diesen einen
        const selectedContacts = appState.getState().ui.selectedContacts;
        if (selectedContacts.has(contactId)) {
            this.draggedContactIds = new Set(selectedContacts);
        } else {
            this.draggedContactIds = new Set([contactId]);
        }

        // DataTransfer setzen
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify([...this.draggedContactIds]));

        // Visual Feedback auf dragged cards
        this.draggedContactIds.forEach(id => {
            const card = document.querySelector(`[data-contact-id="${id}"]`);
            if (card) {
                card.classList.add('draggable--dragging');
            }
        });

        // Custom Drag Image mit Count Badge (wenn multi-select)
        if (this.draggedContactIds.size > 1) {
            this.createDragGhost(e.target, this.draggedContactIds.size);
            e.dataTransfer.setDragImage(this.dragGhost, 0, 0);
        }

        console.log('Drag started:', [...this.draggedContactIds]);
    }

    /**
     * Drag End Handler
     */
    handleDragEnd(e) {
        this.isDragging = false;

        // Remove visual feedback
        this.draggedContactIds.forEach(id => {
            const card = document.querySelector(`[data-contact-id="${id}"]`);
            if (card) {
                card.classList.remove('draggable--dragging');
            }
        });

        // Remove drop-target classes from all groups
        document.querySelectorAll('.group-card').forEach(card => {
            card.classList.remove('group-card--drop-target', 'group-card--drop-invalid');
        });

        // Remove drag ghost
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }

        this.draggedContactIds.clear();
    }

    /**
     * Drag Over Handler (über drop zone)
     */
    handleDragOver(e, groupId) {
        if (!this.isDragging) return;

        e.preventDefault();
        e.stopPropagation();

        e.dataTransfer.dropEffect = 'move';

        const groupCard = e.currentTarget;
        if (!groupCard.classList.contains('group-card--drop-target')) {
            groupCard.classList.add('group-card--drop-target');
        }
    }

    /**
     * Drag Leave Handler
     */
    handleDragLeave(e) {
        const groupCard = e.currentTarget;

        // Nur remove wenn wir wirklich die group-card verlassen
        // (nicht bei hover über child elements)
        const rect = groupCard.getBoundingClientRect();
        if (
            e.clientX < rect.left ||
            e.clientX >= rect.right ||
            e.clientY < rect.top ||
            e.clientY >= rect.bottom
        ) {
            groupCard.classList.remove('group-card--drop-target');
        }
    }

    /**
     * Drop Handler
     */
    async handleDrop(e, groupId) {
        if (!this.isDragging) return;

        e.preventDefault();
        e.stopPropagation();

        const groupCard = e.currentTarget;
        groupCard.classList.remove('group-card--drop-target');

        try {
            // Contacts zur Gruppe hinzufügen
            const contactIds = [...this.draggedContactIds];
            let addedCount = 0;

            for (const contactId of contactIds) {
                try {
                    groupService.addContact(groupId, contactId);
                    addedCount++;
                } catch (error) {
                    console.error('Fehler beim Hinzufügen:', error);
                }
            }

            if (addedCount > 0) {
                const group = groupService.get(groupId);
                const message = addedCount === 1
                    ? `Kontakt zu "${group.name}" hinzugefügt`
                    : `${addedCount} Kontakte zu "${group.name}" hinzugefügt`;

                showToast(message, 'success');

                // Success Animation
                groupCard.style.animation = 'pulse 400ms ease-out';
                setTimeout(() => {
                    groupCard.style.animation = '';
                }, 400);

                // Update UI
                appState.emit('groups:changed');
                appState.emit('contacts:changed');
            }

        } catch (error) {
            console.error('Drop error:', error);
            showToast('Fehler beim Hinzufügen zur Gruppe', 'error');
        }
    }

    /**
     * Custom Drag Ghost mit Count Badge
     */
    createDragGhost(originalElement, count) {
        // Clone element
        const ghost = originalElement.cloneNode(true);
        ghost.style.position = 'absolute';
        ghost.style.top = '-9999px';
        ghost.style.left = '-9999px';
        ghost.style.opacity = '0.8';
        ghost.style.transform = 'rotate(-2deg)';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '9999';

        // Add badge
        const badge = document.createElement('div');
        badge.className = 'multi-select-badge';
        badge.textContent = count;
        ghost.appendChild(badge);

        document.body.appendChild(ghost);
        this.dragGhost = ghost;
    }

    /**
     * Multi-Select Toggle
     */
    toggleContactSelection(contactId, multiSelect = false) {
        const selectedContacts = appState.getState().ui.selectedContacts;

        if (multiSelect) {
            // Toggle selection
            if (selectedContacts.has(contactId)) {
                selectedContacts.delete(contactId);
            } else {
                selectedContacts.add(contactId);
            }
        } else {
            // Single select
            selectedContacts.clear();
            selectedContacts.add(contactId);
        }

        // Update UI
        this.updateSelectionUI();
    }

    /**
     * Clear Selection
     */
    clearSelection() {
        const selectedContacts = appState.getState().ui.selectedContacts;
        selectedContacts.clear();
        this.updateSelectionUI();
    }

    /**
     * Update Selection UI
     */
    updateSelectionUI() {
        const selectedContacts = appState.getState().ui.selectedContacts;

        document.querySelectorAll('.contact-card').forEach(card => {
            const contactId = card.dataset.contactId;
            if (selectedContacts.has(contactId)) {
                card.setAttribute('data-selected', 'true');
            } else {
                card.removeAttribute('data-selected');
            }
        });
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.draggedContactIds.clear();
        this.isDragging = false;
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }
    }
}

const dragDropManager = new DragDropManager();
export default dragDropManager;
