const db = require('../config/db');
const Customer = require('../models/customerModel');

exports.getAllCustomers = async () => {
    try {
      const result = await db.query(`
        SELECT 
          cust, 
          vname, 
          nname, 
          COALESCE(betr, '') AS betr, 
          ida, 
          COALESCE(str, '') AS str, 
          postc, 
          COALESCE(town, '') AS town, 
          aeda, 
          COALESCE(aeid, '') AS aeid, 
          nada, 
          COALESCE(naid, '') AS naid 
        FROM "int".customers
        ORDER BY cust
      `);
      
      return result.rows.map(row => new Customer(row));
    } catch (error) {
      throw new Error(`Fehler beim Abrufen der Kunden: ${error.message}`);
    }
};

exports.getCustomerById = async (id) => {
    try {
      const result = await db.query(`
        SELECT 
          cust, 
          vname, 
          nname, 
          COALESCE(betr, '') AS betr, 
          ida, 
          COALESCE(str, '') AS str, 
          postc, 
          COALESCE(town, '') AS town, 
          aeda, 
          COALESCE(aeid, '') AS aeid, 
          nada, 
          COALESCE(naid, '') AS naid 
        FROM "int".customers 
        WHERE cust = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Customer(result.rows[0]);
    } catch (error) {
      throw new Error(`Fehler beim Abrufen des Kunden: ${error.message}`);
    }
};

exports.createCustomer = async (customerData, username) => {
    try {
      // Nächste ID ermitteln
      const maxIdResult = await db.query('SELECT COALESCE(MAX(cust), 0) AS max_id FROM "int".customers');
      const nextId = parseInt(maxIdResult.rows[0].max_id) + 1;
      
      // Aktuelles Datum
      const currentDate = new Date();
      
      const result = await db.query(`
        INSERT INTO "int".customers 
        (cust, vname, nname, betr, ida, str, postc, town, aeda, aeid, nada, naid) 
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        nextId,
        customerData.vname,
        customerData.nname,
        customerData.betr || null,
        customerData.ida || null,
        customerData.str || null,
        customerData.postc || null,
        customerData.town || null,
        currentDate,
        username,
        currentDate,
        username
      ]);
      
      return new Customer(result.rows[0]);
    } catch (error) {
      throw new Error(`Fehler beim Erstellen des Kunden: ${error.message}`);
    }
};

exports.updateCustomer = async (id, customerData, username) => {
    try {
      // Existierenden Kunden prüfen
      const checkResult = await db.query('SELECT COUNT(*) FROM "int".customers WHERE cust = $1', [id]);
      if (parseInt(checkResult.rows[0].count) === 0) {
        return null;
      }
      
      // Aktuelles Datum
      const currentDate = new Date();
      
      // Zu aktualisierende Felder und Werte sammeln
      const updateFields = ['nada = $1', 'naid = $2'];
      const values = [currentDate, username];
      let paramCount = 3;
      
      if (customerData.vname !== undefined) {
        updateFields.push(`vname = $${paramCount}`);
        values.push(customerData.vname);
        paramCount++;
      }
      
      if (customerData.nname !== undefined) {
        updateFields.push(`nname = $${paramCount}`);
        values.push(customerData.nname);
        paramCount++;
      }
      
      if (customerData.betr !== undefined) {
        updateFields.push(`betr = $${paramCount}`);
        values.push(customerData.betr);
        paramCount++;
      }
      
      if (customerData.ida !== undefined) {
        updateFields.push(`ida = $${paramCount}`);
        values.push(customerData.ida);
        paramCount++;
      }
      
      if (customerData.str !== undefined) {
        updateFields.push(`str = $${paramCount}`);
        values.push(customerData.str);
        paramCount++;
      }
      
      if (customerData.postc !== undefined) {
        updateFields.push(`postc = $${paramCount}`);
        values.push(customerData.postc);
        paramCount++;
      }
      
      if (customerData.town !== undefined) {
        updateFields.push(`town = $${paramCount}`);
        values.push(customerData.town);
        paramCount++;
      }
      
      // ID hinzufügen
      values.push(id);
      
      const query = `
        UPDATE "int".customers 
        SET ${updateFields.join(', ')} 
        WHERE cust = $${paramCount} 
        RETURNING *
      `;
      
      const result = await db.query(query, values);
      return new Customer(result.rows[0]);
    } catch (error) {
      throw new Error(`Fehler beim Aktualisieren des Kunden: ${error.message}`);
    }
  };
  
  // Kunden löschen
  exports.deleteCustomer = async (id) => {
    try {
      // Existierenden Kunden prüfen
      const checkResult = await db.query('SELECT COUNT(*) FROM "int".customers WHERE cust = $1', [id]);
      if (parseInt(checkResult.rows[0].count) === 0) {
        return false;
      }
      
      // Prüfen, ob noch Projekte für diesen Kunden existieren
      const projectsResult = await db.query('SELECT COUNT(*) FROM "int".projects WHERE cust = $1', [id]);
      if (parseInt(projectsResult.rows[0].count) > 0) {
        throw new Error(`Der Kunde mit ID ${id} kann nicht gelöscht werden, da noch ${projectsResult.rows[0].count} Projekte mit diesem Kunden verknüpft sind.`);
      }
      
      // Kunden löschen
      await db.query('DELETE FROM "int".customers WHERE cust = $1', [id]);
      return true;
    } catch (error) {
      throw error; // Fehler weiterreichen
    }
};