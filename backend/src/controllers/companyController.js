// controllers/companyController.js
const companyService = require('../services/companyService');

// Alle Unternehmenseinstellungen abrufen
exports.getAllCompanySettings = async (req, res) => {
  try {
    const settings = await companyService.getAllCompanySettings();
    res.json(settings);
  } catch (error) {
    console.error('Fehler beim Abrufen der Unternehmenseinstellungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Einstellung nach Schlüssel abrufen
exports.getCompanySettingByKey = async (req, res) => {
  try {
    const varkey = req.params.varkey;
    const setting = await companyService.getCompanySettingByKey(varkey);
    
    if (!setting) {
      return res.status(404).json({ message: `Einstellung mit Schlüssel '${varkey}' nicht gefunden.` });
    }
    
    res.json(setting);
  } catch (error) {
    console.error('Fehler beim Abrufen der Unternehmenseinstellung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Unternehmensinfo abrufen
exports.getCompanyInfo = async (req, res) => {
  try {
    const companyInfo = await companyService.getCompanyInfo();
    res.json(companyInfo);
  } catch (error) {
    console.error('Fehler beim Abrufen der Unternehmensinfo:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Neue Einstellung erstellen
exports.createCompanySetting = async (req, res) => {
  try {
    const settingData = req.body;
    
    // Validierung
    if (!settingData.varkey) {
      return res.status(400).json({ message: 'Der Schlüssel (varkey) darf nicht leer sein.' });
    }
    
    if (!settingData.varval) {
      return res.status(400).json({ message: 'Der Wert (varval) darf nicht leer sein.' });
    }
    
    // Compid standardmäßig auf 1 setzen, wenn nicht angegeben
    if (!settingData.compid) {
      settingData.compid = 1;
    }
    
    // Username aus dem Token für naid verwenden
    const username = req.user.username || 'system';
    
    const newSetting = await companyService.createCompanySetting(settingData, username);
    res.status(201).json(newSetting);
  } catch (error) {
    console.error('Fehler beim Erstellen der Unternehmenseinstellung:', error);
    
    if (error.message.includes('existiert bereits')) {
      return res.status(409).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Einstellung aktualisieren
exports.updateCompanySetting = async (req, res) => {
  try {
    const varkey = req.params.varkey;
    const settingData = req.body;
    
    // Validierung
    if (!settingData.varval) {
      return res.status(400).json({ message: 'Der Wert (varval) darf nicht leer sein.' });
    }
    
    // Compid standardmäßig auf 1 setzen, wenn nicht angegeben
    if (!settingData.compid) {
      settingData.compid = 1;
    }
    
    // Username aus dem Token für naid verwenden
    const username = req.user.username || 'system';
    
    const updatedSetting = await companyService.updateCompanySetting(varkey, settingData, username);
    res.json(updatedSetting);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Unternehmenseinstellung:', error);
    
    if (error.message.includes('nicht gefunden')) {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Einstellung löschen
exports.deleteCompanySetting = async (req, res) => {
  try {
    const varkey = req.params.varkey;
    const compid = parseInt(req.query.compid || 1);
    
    await companyService.deleteCompanySetting(varkey, compid);
    res.json({ message: `Eintrag mit Schlüssel '${varkey}' wurde erfolgreich gelöscht.` });
  } catch (error) {
    console.error('Fehler beim Löschen der Unternehmenseinstellung:', error);
    
    if (error.message.includes('nicht gefunden')) {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};