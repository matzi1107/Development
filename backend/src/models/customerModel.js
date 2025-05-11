class Customer {
    constructor(data) {
        this.cust = data.cust;             // Kunden-ID
        this.vname = data.vname;           // Vorname
        this.nname = data.nname;           // Nachname
        this.betr = data.betr || null;     // Betrieb/Firma
        this.ida = data.ida || null;       // Identifikations-Datum
        this.str = data.str || null;       // Straße
        this.postc = data.postc || null;   // Postleitzahl
        this.town = data.town || null;     // Ort
        this.aeda = data.aeda || null;     // Anlege-Datum
        this.aeid = data.aeid || null;     // Anleger-ID
        this.nada = data.nada || null;     // Änderungs-Datum
        this.naid = data.naid || null;     // Änderer-ID
    }

    getFullName() {
        return `${this.vname} ${this.nname}`;
    }

    getFullAddress() {
        return {
            street: this.str,
            postalCode: this.postc,
            town: this.town
        }; 
    }
}

module.exports = Customer;