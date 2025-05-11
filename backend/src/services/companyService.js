// services/companyService.js
const db = require('../config/db');
const { CompanySetting, CompanyInfo } = require('../models/companyModel');

// Alle Unternehmenseinstellungen abrufen
exports.getAllCompanySettings = async () => {
  try {
    const result = await db.query(`
      SELECT compid, varkey, varval, nada, naid
      FROM "int".oscomp
      ORDER BY varkey
    `);
    
    return result.rows.map(row => new CompanySetting(row));
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Unternehmenseinstellungen: ${error.message}`);
  }
};

// Einstellung nach Schlüssel abrufen
exports.getCompanySettingByKey = async (varkey) => {
  try {
    const result = await db.query(`
      SELECT compid, varkey, varval, nada, naid
      FROM "int".oscomp
      WHERE varkey = $1
    `, [varkey]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new CompanySetting(result.rows[0]);
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Unternehmenseinstellung: ${error.message}`);
  }
};

// Unternehmensinfo abrufen
exports.getCompanyInfo = async () => {
  try {
    const settings = await this.getAllCompanySettings();
    return CompanyInfo.fromSettings(settings);
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Unternehmensinfo: ${error.message}`);
  }
};

// Neue Einstellung erstellen
exports.createCompanySetting = async (settingData, username) => {
  try {
    // Prüfen, ob der Eintrag bereits existiert
    const existingResult = await db.query(`
      SELECT COUNT(*) 
      FROM "int".oscomp 
      WHERE compid = $1 AND varkey = $2
    `, [settingData.compid, settingData.varkey]);
    
    if (parseInt(existingResult.rows[0].count) > 0) {
      throw new Error(`Ein Eintrag mit Schlüssel '${settingData.varkey}' existiert bereits. Verwenden Sie PUT zum Aktualisieren.`);
    }
    
    // Aktuelles Datum
    const currentDate = new Date();
    
    const result = await db.query(`
      INSERT INTO "int".oscomp (compid, varkey, varval, nada, naid)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      settingData.compid,
      settingData.varkey,
      settingData.varval,
      currentDate,
      username
    ]);
    
    return new CompanySetting(result.rows[0]);
  } catch (error) {
    throw error; // Fehler weiterreichen
  }
};

// Einstellung aktualisieren
exports.updateCompanySetting = async (varkey, settingData, username) => {
  try {
    // Prüfen, ob der Eintrag existiert
    const existingResult = await db.query(`
      SELECT COUNT(*) 
      FROM "int".oscomp 
      WHERE compid = $1 AND varkey = $2
    `, [settingData.compid, varkey]);
    
    if (parseInt(existingResult.rows[0].count) === 0) {
      throw new Error(`Ein Eintrag mit Schlüssel '${varkey}' wurde nicht gefunden.`);
    }
    
    // Aktuelles Datum
    const currentDate = new Date();
    
    const result = await db.query(`
      UPDATE "int".oscomp
      SET varval = $1, nada = $2, naid = $3
      WHERE compid = $4 AND varkey = $5
      RETURNING *
    `, [
      settingData.varval,
      currentDate,
      username,
      settingData.compid,
      varkey
    ]);
    
    return new CompanySetting(result.rows[0]);
  } catch (error) {
    throw error; // Fehler weiterreichen
  }
};

// Einstellung löschen
exports.deleteCompanySetting = async (varkey, compid) => {
  try {
    // Prüfen, ob der Eintrag existiert
    const existingResult = await db.query(`
      SELECT COUNT(*) 
      FROM "int".oscomp 
      WHERE compid = $1 AND varkey = $2
    `, [compid, varkey]);
    
    if (parseInt(existingResult.rows[0].count) === 0) {
      throw new Error(`Ein Eintrag mit Schlüssel '${varkey}' wurde nicht gefunden.`);
    }
    
    await db.query(`
      DELETE FROM "int".oscomp 
      WHERE compid = $1 AND varkey = $2
    `, [compid, varkey]);
    
    return true;
  } catch (error) {
    throw error; // Fehler weiterreichen
  }
};