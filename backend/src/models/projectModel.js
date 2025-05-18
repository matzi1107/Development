// models/projectModel.js
class Project {
  constructor(data) {
    this.cust = data.cust;               // Kunden-ID
    this.pname = data.pname;             // Projektname
    this.pdate = data.pdate || null;     // Projektdatum
    this.nada = data.nada || null;       // Änderungsdatum
    this.naid = data.naid || null;       // Änderer-ID
    this.subproj = data.subproj || null; // Unterprojekte (komma-separiert)
    this.lnr = data.lnr || 0;            // Laufnummer
    this.patches = data.patches || [];   // Inhalte (Array)
  }

  // Unterprojekte als Array zurückgeben
  getSubprojectsAsArray() {
    if (!this.subproj) {
      return [];
    }
    return this.subproj.split(',').map(s => s.trim()).filter(s => s);
  }
  
  // Formatierter Projektname mit Laufnummer
  getFormattedName() {
    return `${this.pname} (${this.lnr})`;
  }
  
  // Projekt-ID als String (Format: cust/lnr)
  getProjectId() {
    return `${this.cust}/${this.lnr}`;
  }
}

module.exports = Project;