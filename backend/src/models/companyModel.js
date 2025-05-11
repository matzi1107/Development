// models/companyModel.js
class CompanySetting {
  constructor(data) {
    this.compid = data.compid;
    this.varkey = data.varkey;
    this.varval = data.varval;
    this.nada = data.nada || null;
    this.naid = data.naid || null;
  }
}

class CompanyInfo {
  constructor(data = {}) {
    this.name = data.name || '';
    this.street = data.street || '';
    this.postalCode = data.postalCode || '';
    this.city = data.city || '';
    this.phone = data.phone || '';
    this.email = data.email || '';
    this.website = data.website || '';
    this.taxId = data.taxId || '';
    this.vatId = data.vatId || '';
    this.bankName = data.bankName || '';
    this.iban = data.iban || '';
    this.bic = data.bic || '';
    this.registerNumber = data.registerNumber || '';
    this.registerCourt = data.registerCourt || '';
    this.managerName = data.managerName || '';
  }

  // Konvertiert CompanyInfo in eine Liste von CompanySetting-Objekten
  toSettings(compid = 1) {
    const settings = [];
    const currentDate = new Date();
    const username = 'system';

    Object.entries(this).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        settings.push(new CompanySetting({
          compid: compid,
          varkey: key,
          varval: value,
          nada: currentDate,
          naid: username
        }));
      }
    });

    return settings;
  }

  // Erzeugt CompanyInfo aus einer Liste von CompanySetting-Objekten
  static fromSettings(settings) {
    const companyInfo = new CompanyInfo();
    
    settings.forEach(setting => {
      if (Object.prototype.hasOwnProperty.call(companyInfo, setting.varkey)) {
        companyInfo[setting.varkey] = setting.varval;
      }
    });

    return companyInfo;
  }
}

module.exports = {
  CompanySetting,
  CompanyInfo
};