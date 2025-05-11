// routes/projectRoutes.js
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const auth = require('../middleware/auth');

// Alle Routen mit Auth-Middleware schützen
router.use(auth.verifyToken);

// Projektendpunkte
router.get('/', projectController.getAllProjects);
router.get('/:cust/:lnr', projectController.getProjectByCustomerAndLnr);
router.post('/', projectController.createProject);
router.put('/:cust/:lnr', projectController.updateProject);
router.delete('/:cust/:lnr', projectController.deleteProject);

module.exports = router;