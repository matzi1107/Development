// services/projectService.js
const db = require('../config/db');
const Project = require('../models/projectModel');

// Alle Projekte abrufen
exports.getAllProjects = async () => {
  try {
    const result = await db.query(`
      SELECT 
        cust, 
        pname, 
        pdate, 
        nada, 
        COALESCE(naid, '') AS naid, 
        COALESCE(subproj, '') AS subproj, 
        COALESCE(lnr, 0) AS lnr, 
        COALESCE(patches, '[]') AS patches
      FROM "int".projects
      ORDER BY cust, COALESCE(lnr, 0)
    `);
    
    return result.rows.map(row => {
      // patches als Array parsen
      if (typeof row.patches === 'string') {
        try { row.patches = JSON.parse(row.patches); } catch { row.patches = []; }
      }
      return new Project(row);
    });
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Projekte: ${error.message}`);
  }
};

// Projekt nach Kunde und Laufnummer abrufen
exports.getProjectByCustomerAndLnr = async (cust, lnr) => {
  try {
    const result = await db.query(`
      SELECT 
        cust, 
        pname, 
        pdate, 
        nada, 
        COALESCE(naid, '') AS naid, 
        COALESCE(subproj, '') AS subproj, 
        COALESCE(lnr, 0) AS lnr, 
        COALESCE(patches, '[]') AS patches
      FROM "int".projects 
      WHERE cust = $1 AND COALESCE(lnr, 0) = $2
    `, [cust, lnr]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new Project(result.rows[0]);
  } catch (error) {
    throw new Error(`Fehler beim Abrufen des Projekts: ${error.message}`);
  }
};

// Projekte nach Kunde abrufen
exports.getProjectsByCustomer = async (custId) => {
  try {
    const result = await db.query(`
      SELECT 
        cust, 
        pname, 
        pdate, 
        nada, 
        COALESCE(naid, '') AS naid, 
        COALESCE(subproj, '') AS subproj, 
        COALESCE(lnr, 0) AS lnr, 
        COALESCE(patches, '[]') AS patches
      FROM "int".projects 
      WHERE cust = $1
      ORDER BY COALESCE(lnr, 0)
    `, [custId]);
    
    return result.rows.map(row => {
      if (typeof row.patches === 'string') {
        try { row.patches = JSON.parse(row.patches); } catch { row.patches = []; }
      }
      return new Project(row);
    });
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Projekte für Kunde ${custId}: ${error.message}`);
  }
};

// Neues Projekt erstellen
exports.createProject = async (projectData, username) => {
  try {
    // 1. Nächste LNR für den Kunden ermitteln
    const maxLnrResult = await db.query(`
      SELECT COALESCE(MAX(lnr), 0) AS max_lnr
      FROM "int".projects
      WHERE cust = $1
    `, [projectData.cust]);
    
    const nextLnr = parseInt(maxLnrResult.rows[0].max_lnr) + 1;
    
    // 2. Aktuelles Datum
    const currentDate = new Date();
    
    // 3. Projekt in Datenbank einfügen
    const result = await db.query(`
      INSERT INTO "int".projects 
      (cust, pname, pdate, nada, naid, subproj, lnr, patches) 
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      projectData.cust,
      projectData.pname,
      projectData.pdate || currentDate,
      currentDate,
      username,
      projectData.subproj || null,
      nextLnr,
      JSON.stringify(projectData.patches || [])
    ]);
    const row = result.rows[0];
    if (typeof row.patches === 'string') {
      try { row.patches = JSON.parse(row.patches); } catch { row.patches = []; }
    }
    return new Project(row);
  } catch (error) {
    throw new Error(`Fehler beim Erstellen des Projekts: ${error.message}`);
  }
};

// Projekt aktualisieren
exports.updateProject = async (cust, lnr, projectData, username) => {
  try {
    // 1. Prüfen, ob das Projekt existiert
    const projectExists = await db.query(`
      SELECT COUNT(*) 
      FROM "int".projects 
      WHERE cust = $1 AND COALESCE(lnr, 0) = $2
    `, [cust, lnr]);
    
    if (parseInt(projectExists.rows[0].count) === 0) {
      return null;
    }
    
    // 2. Aktuelles Datum
    const currentDate = new Date();
    
    // 3. Zu aktualisierende Felder und Werte sammeln
    const updateFields = ['nada = $1', 'naid = $2'];
    const values = [currentDate, username];
    let paramCount = 3;
    
    if (projectData.pname !== undefined) {
      updateFields.push(`pname = $${paramCount}`);
      values.push(projectData.pname);
      paramCount++;
    }
    
    if (projectData.pdate !== undefined) {
      updateFields.push(`pdate = $${paramCount}`);
      values.push(projectData.pdate);
      paramCount++;
    }
    
    if (projectData.subproj !== undefined) {
      updateFields.push(`subproj = $${paramCount}`);
      values.push(projectData.subproj);
      paramCount++;
    }
    
    if (projectData.patches !== undefined) {
      updateFields.push(`patches = $${paramCount}`);
      values.push(JSON.stringify(projectData.patches));
      paramCount++;
    }
    
    // Kunde und Laufnummer für WHERE-Klausel hinzufügen
    values.push(cust);
    values.push(lnr);
    
    // 4. Projekt aktualisieren
    const query = `
      UPDATE "int".projects 
      SET ${updateFields.join(', ')} 
      WHERE cust = $${paramCount} AND COALESCE(lnr, 0) = $${paramCount + 1}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    const row = result.rows[0];
    if (typeof row.patches === 'string') {
      try { row.patches = JSON.parse(row.patches); } catch { row.patches = []; }
    }
    return new Project(row);
  } catch (error) {
    throw new Error(`Fehler beim Aktualisieren des Projekts: ${error.message}`);
  }
};

// Projekt löschen
exports.deleteProject = async (cust, lnr) => {
  try {
    // 1. Prüfen, ob das Projekt existiert
    const projectExists = await db.query(`
      SELECT COUNT(*) 
      FROM "int".projects 
      WHERE cust = $1 AND COALESCE(lnr, 0) = $2
    `, [cust, lnr]);
    
    if (parseInt(projectExists.rows[0].count) === 0) {
      return false;
    }
    
    // 2. Prüfen, ob das Projekt in Rechnungen verwendet wird
    const invoicesExist = await db.query(`
      SELECT COUNT(*) 
      FROM "int".invoices 
      WHERE cust = $1 AND proj_lnr = $2
    `, [cust, lnr]);
    
    if (parseInt(invoicesExist.rows[0].count) > 0) {
      throw new Error(`Das Projekt kann nicht gelöscht werden, da es in ${invoicesExist.rows[0].count} Rechnungen verwendet wird.`);
    }
    
    // 3. Projekt löschen
    await db.query(`
      DELETE FROM "int".projects 
      WHERE cust = $1 AND COALESCE(lnr, 0) = $2
    `, [cust, lnr]);
    
    return true;
  } catch (error) {
    throw error; // Fehler weiterreichen
  }
};

// Unterprojekte validieren
exports.validateSubprojects = (subprojs) => {
  const allowedSubprojects = ['Foto', 'Video', 'Branding', 'Dokumente'];
  
  // Leerer String ist erlaubt
  if (!subprojs) return true;
  
  // Prüfen, ob alle angegebenen Unterprojekte erlaubt sind
  const subprojArray = subprojs.split(',').map(s => s.trim()).filter(s => s);
  
  const invalidSubprojs = subprojArray.filter(s => !allowedSubprojects.includes(s));
  
  if (invalidSubprojs.length > 0) {
    throw new Error(`Ungültige Unterprojekte: ${invalidSubprojs.join(', ')}. Erlaubte Werte sind: ${allowedSubprojects.join(', ')}`);
  }
  
  return true;
};

module.exports = exports;