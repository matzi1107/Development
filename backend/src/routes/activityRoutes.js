// routes/activityRoutes.js
const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const auth = require('../middleware/auth');

// Alle Routen mit Auth-Middleware schützen
router.use(auth.verifyToken);

// Aktivitäten-Endpunkte
router.get('/', activityController.getRecentActivities);

module.exports = router;