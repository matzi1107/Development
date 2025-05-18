// routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const auth = require('../middleware/auth');

// Alle Routen mit Auth-Middleware schützen
router.use(auth.verifyToken);

// Unternehmensinformationen abrufen
router.get('/settings', companyController.getAllCompanySettings);
router.get('/settings/:varkey', companyController.getCompanySettingByKey);
router.get('/info', companyController.getCompanyInfo);

// Unternehmensinformationen verwalten
router.post('/settings', companyController.createCompanySetting);
router.put('/settings/:varkey', companyController.updateCompanySetting);
router.put('/settings', companyController.updateAllCompanySettings);
router.delete('/settings/:varkey', companyController.deleteCompanySetting);

module.exports = router;