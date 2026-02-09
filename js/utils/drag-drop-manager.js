/**
 * Drag & Drop Manager
 * Verwaltet das Drag & Drop System für Contacts → Groups
 */

import groupService from '../services/group-service.js';
import eventService from '../services/event-service.js';
import appState from '../state/app-state.js';
import { showToast } from './helpers.js';

class DragDropManager {
    constructor() {
        this.draggedContactIds = new Set();
        this.draggedGroupIds = new Set();
        this.dragType = null; // 'contact' | 'group'
        this.isDragging = false;
        this.dragGhost = null;
    }

    /**
     * Contact-Cards als draggable machen
     */
    makeDraggable(element, contactId) {
        element.setAttribute('draggable', 'true');
        element.classList.add('draggable');

        element.addEventListener('dragstart', (e) => this.handleDragStart(e, contactId, 'contact'));
        element.addEventListener('dragend', (e) => this.handleDragEnd(e));
    }

    /**
     * Group-Cards als draggable machen
     */
    makeGroupDraggable(element, groupId) {
        element.setAttribute('draggable', 'true');
        element.classList.add('draggable');

        element.addEventListener('dragstart', (e) => this.handleDragStart(e, groupId, 'group'));
        element.addEventListener('dragend', (e) => this.handleDragEnd(e));
    }

    /**
     * Group-Cards als drop-zones machen
     */
    makeDroppable(element, groupId) {
        element.classList.add('drop-zone');
        element.dataset.dropTarget = 'group';
        element.dataset.targetId = groupId;

        element.addEventListener('dragover', (e) => this.handleDragOver(e));
        element.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        element.addEventListener('drop', (e) => this.handleDrop(e));
    }

    /**
     * Event-Cards als drop-zones machen
     */
    makeEventDroppable(element, eventId) {
        element.classList.add('drop-zone');
        element.dataset.dropTarget = 'event';
        element.dataset.targetId = eventId;

        element.addEventListener('dragover', (e) => this.handleDragOver(e));
        element.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        element.addEventListener('drop', (e) => this.handleDrop(e));
    }

    /**
     * Drag Start Handler
     */
    handleDragStart(e, itemId, type) {
        this.isDragging = true;
        this.dragType = type;

        if (type === 'contact') {
            // Contact Drag
            const selectedContacts = appState.getState().ui.selectedContacts;
            if (selectedContacts.has(itemId)) {
                this.draggedContactIds = new Set(selectedContacts);
            } else {
                this.draggedContactIds = new Set([itemId]);
            }

            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'contact',
                ids: [...this.draggedContactIds]
            }));

            this.draggedContactIds.forEach(id => {
                const card = document.querySelector(`[data-contact-id="${id}"]`);
                if (card) card.classList.add('draggable--dragging');
            });

            if (this.draggedContactIds.size > 1) {
                this.createDragGhost(e.target, this.draggedContactIds.size);
                e.dataTransfer.setDragImage(this.dragGhost, 0, 0);
            }

        } else if (type === 'group') {
            // Group Drag
            this.draggedGroupIds = new Set([itemId]);

            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'group',
                ids: [itemId]
            }));

            const card = document.querySelector(`[data-group-id="${itemId}"]`);
            if (card) card.classList.add('draggable--dragging');
        }

        e.dataTransfer.effectAllowed = 'move';
    }

    /**
     * Drag End Handler
     */
    handleDragEnd(e) {
        this.isDragging = false;

        // Remove visual feedback
        this.draggedContactIds.forEach(id => {
            const card = document.querySelector(`[data-contact-id="${id}"]`);
            if (card) card.classList.remove('draggable--dragging');
        });

        this.draggedGroupIds.forEach(id => {
            const card = document.querySelector(`[data-group-id="${id}"]`);
            if (card) card.classList.remove('draggable--dragging');
        });

        // Remove drop-target classes
        document.querySelectorAll('.group-card, .event-card').forEach(card => {
            card.classList.remove('group-card--drop-target', 'event-card--drop-target');
        });

        // Remove drag ghost
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }

        this.draggedContactIds.clear();
        this.draggedGroupIds.clear();
        this.dragType = null;
    }

    /**
     * Drag Over Handler (über drop zone)
     */
    handleDragOver(e) {
        if (!this.isDragging) return;

        e.preventDefault();
        e.stopPropagation();

        e.dataTransfer.dropEffect = 'move';

        const dropZone = e.currentTarget;
        const dropTarget = dropZone.dataset.dropTarget;

        const targetClass = dropTarget === 'group' ? 'group-card--drop-target' : 'event-card--drop-target';
        if (!dropZone.classList.contains(targetClass)) {
            dropZone.classList.add(targetClass);
        }
    }

    /**
     * Drag Leave Handler
     */
    handleDragLeave(e) {
        const dropZone = e.currentTarget;

        const rect = dropZone.getBoundingClientRect();
        if (
            e.clientX < rect.left ||
            e.clientX >= rect.right ||
            e.clientY < rect.top ||
            e.clientY >= rect.bottom
        ) {
            dropZone.classList.remove('group-card--drop-target', 'event-card--drop-target');
        }
    }

    /**
     * Drop Handler
     */
    async handleDrop(e) {
        if (!this.isDragging) return;

        e.preventDefault();
        e.stopPropagation();

        const dropZone = e.currentTarget;
        const dropTarget = dropZone.dataset.dropTarget;
        const targetId = dropZone.dataset.targetId;

        dropZone.classList.remove('group-card--drop-target', 'event-card--drop-target');

        try {
            if (dropTarget === 'group') {
                await this.handleDropOnGroup(targetId, dropZone);
            } else if (dropTarget === 'event') {
                await this.handleDropOnEvent(targetId, dropZone);
            }
        } catch (error) {
            console.error('Drop error:', error);
            showToast('Fehler beim Hinzufügen', 'error');
        }
    }

    /**
     * Drop auf Group Handler
     */
    async handleDropOnGroup(groupId, dropZone) {
        if (this.dragType !== 'contact') return;

        const contactIds = [...this.draggedContactIds];
        let addedCount = 0;

        for (const contactId of contactIds) {
            try {
                groupService.addContact(groupId, contactId);
                addedCount++;
            } catch (error) {
                console.error('Fehler:', error);
            }
        }

        if (addedCount > 0) {
            const group = groupService.get(groupId);
            const message = addedCount === 1
                ? `Kontakt zu "${group.name}" hinzugefügt`
                : `${addedCount} Kontakte zu "${group.name}" hinzugefügt`;

            showToast(message, 'success');

            dropZone.style.animation = 'pulse 400ms ease-out';
            setTimeout(() => dropZone.style.animation = '', 400);

            appState.emit('groups:changed');
            appState.emit('contacts:changed');
        }
    }

    /**
     * Drop auf Event Handler
     */
    async handleDropOnEvent(eventId, dropZone) {
        let addedCount = 0;
        const event = eventService.get(eventId);

        if (this.dragType === 'contact') {
            // Contacts zu Event hinzufügen
            const contactIds = [...this.draggedContactIds];
            for (const contactId of contactIds) {
                try {
                    eventService.addContact(eventId, contactId);
                    addedCount++;
                } catch (error) {
                    console.error('Fehler:', error);
                }
            }

            if (addedCount > 0) {
                const message = addedCount === 1
                    ? `Kontakt zu Event "${event.name}" hinzugefügt`
                    : `${addedCount} Kontakte zu Event "${event.name}" hinzugefügt`;
                showToast(message, 'success');
            }

        } else if (this.dragType === 'group') {
            // Group zu Event hinzufügen
            const groupIds = [...this.draggedGroupIds];
            for (const groupId of groupIds) {
                try {
                    eventService.addGroup(eventId, groupId);
                    addedCount++;
                } catch (error) {
                    console.error('Fehler:', error);
                }
            }

            if (addedCount > 0) {
                showToast(`Gruppe zu Event "${event.name}" hinzugefügt`, 'success');
            }
        }

        if (addedCount > 0) {
            dropZone.style.animation = 'pulse 400ms ease-out';
            setTimeout(() => dropZone.style.animation = '', 400);

            appState.emit('events:changed');
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
