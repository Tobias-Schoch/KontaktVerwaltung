/**
 * CSV Export Service für Serienbriefe
 */

class CSVExportService {
    /**
     * Anrede für einen Kontakt generieren (inkl. Nachname)
     */
    getSalutation(contact) {
        const gender = contact.fields?.gender || '';
        const lastName = contact.fields?.lastName || '';

        if (gender === 'male') {
            return `Sehr geehrter Herr ${lastName}`.trim();
        } else if (gender === 'female') {
            return `Sehr geehrte Frau ${lastName}`.trim();
        } else {
            return `Sehr geehrte/r ${lastName}`.trim();
        }
    }

    /**
     * Kontakte als CSV für Serienbriefe exportieren
     */
    exportForMailMerge(contacts) {
        if (!contacts || contacts.length === 0) {
            throw new Error('Keine Kontakte zum Exportieren vorhanden');
        }

        // CSV Header
        const headers = [
            'Anrede',
            'Vorname',
            'Nachname',
            'Straße',
            'PLZ',
            'Ort',
            'Land'
        ];

        // CSV Rows
        const rows = contacts.map(contact => {
            return [
                this.escapeCsvField(this.getSalutation(contact)),
                this.escapeCsvField(contact.fields?.firstName || ''),
                this.escapeCsvField(contact.fields?.lastName || ''),
                this.escapeCsvField(contact.fields?.address?.street || ''),
                this.escapeCsvField(contact.fields?.address?.zip || ''),
                this.escapeCsvField(contact.fields?.address?.city || ''),
                this.escapeCsvField(contact.fields?.address?.country || '')
            ];
        });

        // CSV String erstellen
        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\n');

        // Download
        this.downloadCSV(csvContent, 'serienbriefe.csv');
    }

    /**
     * Einzelne Gruppe als CSV exportieren
     */
    exportGroupForMailMerge(contacts, groupName) {
        const filename = `serienbrief_${this.sanitizeFilename(groupName)}.csv`;

        // CSV Header
        const headers = [
            'Anrede',
            'Vorname',
            'Nachname',
            'Straße',
            'PLZ',
            'Ort',
            'Land'
        ];

        // CSV Rows
        const rows = contacts.map(contact => {
            return [
                this.escapeCsvField(this.getSalutation(contact)),
                this.escapeCsvField(contact.fields?.firstName || ''),
                this.escapeCsvField(contact.fields?.lastName || ''),
                this.escapeCsvField(contact.fields?.address?.street || ''),
                this.escapeCsvField(contact.fields?.address?.zip || ''),
                this.escapeCsvField(contact.fields?.address?.city || ''),
                this.escapeCsvField(contact.fields?.address?.country || '')
            ];
        });

        // CSV String erstellen
        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\n');

        // Download
        this.downloadCSV(csvContent, filename);
    }

    /**
     * CSV-Feld escapen
     */
    escapeCsvField(field) {
        if (!field) return '';

        const fieldStr = String(field);

        // Wenn Feld Semikolon, Anführungszeichen oder Zeilenumbruch enthält,
        // muss es in Anführungszeichen gesetzt werden
        if (fieldStr.includes(';') || fieldStr.includes('"') || fieldStr.includes('\n')) {
            return `"${fieldStr.replace(/"/g, '""')}"`;
        }

        return fieldStr;
    }

    /**
     * Dateiname sanitizen
     */
    sanitizeFilename(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 50);
    }

    /**
     * CSV Download
     */
    downloadCSV(csvContent, filename) {
        // BOM für Excel UTF-8 Support
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], {
            type: 'text/csv;charset=utf-8;'
        });

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }
}

const csvExportService = new CSVExportService();
export default csvExportService;
