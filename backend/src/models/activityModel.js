// models/activityModel.js
class Activity {
  constructor(data) {
    this.description = data.description; // Beschreibung der Aktivität
    this.category = data.category;       // Kategorie (z.B. Kunde, Projekt, Rechnung, Zahlung)
    this.timestamp = data.timestamp;     // Zeitstempel der Aktivität
    this.status = data.status;           // Status (new, pending, completed, error)
    this.entityId = data.entityId || null; // Optional: ID der zugehörigen Entität
    this.entityType = data.entityType || null; // Optional: Typ der zugehörigen Entität
  }

  // Status in eine lesbare Form umwandeln
  getReadableStatus() {
    const statusMap = {
      'new': 'Neu',
      'pending': 'In Bearbeitung',
      'completed': 'Abgeschlossen',
      'error': 'Fehler'
    };
    
    return statusMap[this.status] || this.status;
  }
  
  // Zeitstempel in ein lesbares Format umwandeln
  getFormattedTimestamp() {
    if (!this.timestamp) return '';
    
    const date = new Date(this.timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

module.exports = Activity;