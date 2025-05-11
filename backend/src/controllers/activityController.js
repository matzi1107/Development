// controllers/activityController.js
const activityService = require('../services/activityService');

// Neueste Aktivitäten abrufen
exports.getRecentActivities = async (req, res) => {
  try {
    // Limit aus Query-Parameter extrahieren oder Standardwert verwenden
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    // Kategorie, falls vorhanden
    const category = req.query.category;
    
    // Entity-Typ und ID, falls vorhanden
    const entityType = req.query.entityType;
    const entityId = req.query.entityId;
    
    let activities;
    
    if (category) {
      // Nach Kategorie filtern
      activities = await activityService.getActivitiesByCategory(category, limit);
    } else if (entityType && entityId) {
      // Nach Entität filtern
      activities = await activityService.getActivitiesByEntity(entityType, entityId, limit);
    } else {
      // Alle neuesten Aktivitäten abrufen
      activities = await activityService.getRecentActivities(limit);
    }
    
    res.json(activities);
  } catch (error) {
    console.error('Fehler beim Abrufen der Aktivitäten:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};