/**
 * Demo Daten für Testing
 */

import { generateUUID } from './helpers.js';

export function generateDemoData() {
    const now = new Date().toISOString();

    // Demo Contacts
    const contacts = [
        {
            id: generateUUID(),
            createdAt: now,
            updatedAt: now,
            fields: {
                firstName: 'Max',
                lastName: 'Mustermann',
                email: 'max.mustermann@example.com',
                phone: '+49 123 4567890',
                mobile: '+49 170 1234567',
                company: 'Musterfirma GmbH',
                address: {
                    street: 'Musterstraße 1',
                    city: 'München',
                    zip: '80331',
                    country: 'Deutschland'
                },
                notes: 'Wichtiger Kunde'
            },
            groupIds: [],
            tags: ['vip', 'kunde'],
            archived: false
        },
        {
            id: generateUUID(),
            createdAt: now,
            updatedAt: now,
            fields: {
                firstName: 'Erika',
                lastName: 'Musterfrau',
                email: 'erika.musterfrau@example.com',
                phone: '+49 89 123456',
                mobile: '+49 171 9876543',
                company: 'Design Studio',
                address: {
                    street: 'Kreativweg 5',
                    city: 'Berlin',
                    zip: '10115',
                    country: 'Deutschland'
                },
                notes: 'Interessiert an Zusammenarbeit'
            },
            groupIds: [],
            tags: ['interessent'],
            archived: false
        },
        {
            id: generateUUID(),
            createdAt: now,
            updatedAt: now,
            fields: {
                firstName: 'Hans',
                lastName: 'Schmidt',
                email: 'h.schmidt@tech-corp.de',
                phone: '+49 30 987654',
                mobile: '',
                company: 'Tech Corp',
                address: {
                    street: 'Technikstraße 42',
                    city: 'Hamburg',
                    zip: '20095',
                    country: 'Deutschland'
                },
                notes: 'CTO, sehr technikaffin'
            },
            groupIds: [],
            tags: ['partner', 'tech'],
            archived: false
        },
        {
            id: generateUUID(),
            createdAt: now,
            updatedAt: now,
            fields: {
                firstName: 'Anna',
                lastName: 'Weber',
                email: 'anna.weber@startup.io',
                phone: '',
                mobile: '+49 160 5555555',
                company: 'StartUp.io',
                address: {
                    street: 'Innovation Hub 7',
                    city: 'Frankfurt',
                    zip: '60311',
                    country: 'Deutschland'
                },
                notes: 'Gründerin, sehr engagiert'
            },
            groupIds: [],
            tags: ['startup', 'vip'],
            archived: false
        },
        {
            id: generateUUID(),
            createdAt: now,
            updatedAt: now,
            fields: {
                firstName: 'Thomas',
                lastName: 'Müller',
                email: 'thomas.mueller@email.de',
                phone: '+49 221 111222',
                mobile: '+49 175 1231234',
                company: '',
                address: {
                    street: 'Hauptstraße 99',
                    city: 'Köln',
                    zip: '50667',
                    country: 'Deutschland'
                },
                notes: 'Privatkontakt, Fotograf'
            },
            groupIds: [],
            tags: ['privat', 'fotograf'],
            archived: false
        },
        {
            id: generateUUID(),
            createdAt: now,
            updatedAt: now,
            fields: {
                firstName: 'Sophie',
                lastName: 'Schneider',
                email: 'sophie@marketing-pro.de',
                phone: '+49 711 888999',
                mobile: '',
                company: 'Marketing Pro',
                address: {
                    street: 'Marketingplatz 3',
                    city: 'Stuttgart',
                    zip: '70173',
                    country: 'Deutschland'
                },
                notes: 'Marketing-Expertin, sehr kreativ'
            },
            groupIds: [],
            tags: ['marketing', 'partner'],
            archived: false
        }
    ];

    // Demo Groups
    const kundenGroupId = generateUUID();
    const partnerGroupId = generateUUID();
    const privatGroupId = generateUUID();

    const groups = [
        {
            id: kundenGroupId,
            name: 'Kunden',
            description: 'Alle aktiven Kunden',
            color: 'blue',
            contactIds: [contacts[0].id, contacts[1].id], // Max, Erika
            createdAt: now,
            updatedAt: now
        },
        {
            id: partnerGroupId,
            name: 'Partner',
            description: 'Geschäftspartner und Kooperationen',
            color: 'green',
            contactIds: [contacts[2].id, contacts[5].id], // Hans, Sophie
            createdAt: now,
            updatedAt: now
        },
        {
            id: privatGroupId,
            name: 'Privat',
            description: 'Private Kontakte',
            color: 'purple',
            contactIds: [contacts[4].id], // Thomas
            createdAt: now,
            updatedAt: now
        }
    ];

    // Update contacts with group IDs
    contacts[0].groupIds = [kundenGroupId];
    contacts[1].groupIds = [kundenGroupId];
    contacts[2].groupIds = [partnerGroupId];
    contacts[4].groupIds = [privatGroupId];
    contacts[5].groupIds = [partnerGroupId];

    // Demo Events
    const events = [
        {
            id: generateUUID(),
            name: 'Networking Event 2026',
            description: 'Jährliches Networking-Treffen mit Kunden und Partnern',
            eventDate: '2026-03-15',
            location: 'München, Event Center',
            attendees: {
                groupIds: [kundenGroupId, partnerGroupId],
                contactIds: []
            },
            createdAt: now,
            updatedAt: now
        },
        {
            id: generateUUID(),
            name: 'Teammeeting',
            description: 'Quartalsbesprechung',
            eventDate: '2026-02-20',
            location: 'Zoom',
            attendees: {
                groupIds: [],
                contactIds: [contacts[2].id, contacts[5].id] // Hans, Sophie
            },
            createdAt: now,
            updatedAt: now
        }
    ];

    // Custom Fields
    const customFields = [
        {
            id: generateUUID(),
            name: 'Website',
            type: 'text',
            required: false,
            defaultValue: '',
            order: 1,
            category: 'custom'
        },
        {
            id: generateUUID(),
            name: 'Geburtstag',
            type: 'date',
            required: false,
            defaultValue: '',
            order: 2,
            category: 'custom'
        }
    ];

    return {
        version: '1.0.0',
        created: now,
        modified: now,
        contacts,
        groups,
        events,
        customFields,
        settings: {
            theme: 'light',
            defaultEmail: '',
            animationsEnabled: true
        },
        history: []
    };
}
