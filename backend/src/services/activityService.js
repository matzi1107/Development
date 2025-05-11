// services/activityService.js
const db = require('../config/db');
const Activity = require('../models/activityModel');

// Neueste Aktivitäten abrufen
exports.getRecentActivities = async (limit = 10) => {
  try {
    const activities = [];
    
    // 1. Neueste Kunden abrufen
    const newCustomers = await db.query(`
      SELECT 
        CONCAT('Neuer Kunde: ', vname, ' ', nname) AS description,
        'Kunde' AS category,
        nada AS timestamp,
        'new' AS status,
        cust AS entity_id,
        'customer' AS entity_type
      FROM "int".customers
      ORDER BY nada DESC
      LIMIT 5
    `);
    
    activities.push(...newCustomers.rows.map(row => new Activity({
      description: row.description,
      category: row.category,
      timestamp: row.timestamp,
      status: row.status,
      entityId: row.entity_id,
      entityType: row.entity_type
    })));
    
    // 2. Neueste Projekte abrufen
    const newProjects = await db.query(`
      SELECT 
        CONCAT('Neues Projekt angelegt: ', p.pname) AS description,
        'Projekt' AS category,
        p.nada AS timestamp,
        'completed' AS status,
        CONCAT(p.cust, '/', COALESCE(p.lnr, 0)) AS entity_id,
        'project' AS entity_type
      FROM "int".projects p
      ORDER BY p.nada DESC
      LIMIT 5
    `);
    
    activities.push(...newProjects.rows.map(row => new Activity({
      description: row.description,
      category: row.category,
      timestamp: row.timestamp,
      status: row.status,
      entityId: row.entity_id,
      entityType: row.entity_type
    })));
    
    // 3. Neueste Rechnungen abrufen (falls die Tabelle existiert)
    try {
      const newInvoices = await db.query(`
        SELECT 
          CONCAT('Rechnung ', i.renr, ' erstellt') AS description,
          'Rechnung' AS category,
          i.nada AS timestamp,
          CASE 
            WHEN i.status = 'paid' THEN 'completed'
            WHEN i.status = 'sent' THEN 'pending'
            WHEN i.status = 'draft' THEN 'new'
            WHEN i.status = 'overdue' THEN 'error'
            ELSE i.status
          END AS status,
          i.reid AS entity_id,
          'invoice' AS entity_type
        FROM "int".invoices i
        ORDER BY i.nada DESC
        LIMIT 5
      `);
      
      activities.push(...newInvoices.rows.map(row => new Activity({
        description: row.description,
        category: row.category,
        timestamp: row.timestamp,
        status: row.status,
        entityId: row.entity_id,
        entityType: row.entity_type
      })));
    } catch (error) {
      console.log('Invoices-Tabelle möglicherweise noch nicht vorhanden:', error.message);
    }
    
    // 4. Neueste Zahlungen abrufen (falls die Tabelle existiert)
    try {
      const newPayments = await db.query(`
        SELECT 
          CONCAT('Zahlung für Rechnung ', i.renr, ' eingegangen') AS description,
          'Zahlung' AS category,
          p.nada AS timestamp,
          'completed' AS status,
          p.payid AS entity_id,
          'payment' AS entity_type
        FROM "int".payments p
        JOIN "int".invoices i ON p.reid = i.reid
        ORDER BY p.nada DESC
        LIMIT 5
      `);
      
      activities.push(...newPayments.rows.map(row => new Activity({
        description: row.description,
        category: row.category,
        timestamp: row.timestamp,
        status: row.status,
        entityId: row.entity_id,
        entityType: row.entity_type
      })));
    } catch (error) {
      console.log('Payments-Tabelle möglicherweise noch nicht vorhanden:', error.message);
    }
    
    // 5. Sortieren nach Zeitstempel (neueste zuerst) und Limit anwenden
    return activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Aktivitäten: ${error.message}`);
  }
};

// Aktivitäten nach Kategorie abrufen
exports.getActivitiesByCategory = async (category, limit = 10) => {
  try {
    const activities = await this.getRecentActivities(50); // Mehr abrufen, da wir später filtern
    
    return activities
      .filter(activity => activity.category.toLowerCase() === category.toLowerCase())
      .slice(0, limit);
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Aktivitäten nach Kategorie: ${error.message}`);
  }
};

// Aktivitäten bezogen auf eine bestimmte Entität abrufen
exports.getActivitiesByEntity = async (entityType, entityId, limit = 10) => {
  try {
    const activities = await this.getRecentActivities(50); // Mehr abrufen, da wir später filtern
    
    return activities
      .filter(activity => 
        activity.entityType === entityType && 
        activity.entityId.toString() === entityId.toString()
      )
      .slice(0, limit);
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Aktivitäten nach Entität: ${error.message}`);
  }
};