// controllers/projectController.js
const projectService = require('../services/projectService');

// Alle Projekte abrufen
exports.getAllProjects = async (req, res) => {
  try {
    // Kunden-Filter aus Query-Parameter
    const custId = req.query.cust ? parseInt(req.query.cust) : null;
    
    let projects;
    if (custId) {
      // Projekte für einen bestimmten Kunden abrufen
      projects = await projectService.getProjectsByCustomer(custId);
    } else {
      // Alle Projekte abrufen
      projects = await projectService.getAllProjects();
    }
    
    res.json(projects);
  } catch (error) {
    console.error('Fehler beim Abrufen der Projekte:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Projekt nach Kunde und Laufnummer abrufen
exports.getProjectByCustomerAndLnr = async (req, res) => {
  try {
    const cust = parseInt(req.params.cust);
    const lnr = parseInt(req.params.lnr);
    
    const project = await projectService.getProjectByCustomerAndLnr(cust, lnr);
    
    if (!project) {
      return res.status(404).json({ message: `Projekt für Kunde ${cust} mit LNR ${lnr} wurde nicht gefunden.` });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Fehler beim Abrufen des Projekts:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Neues Projekt erstellen
exports.createProject = async (req, res) => {
  try {
    const projectData = req.body;
    
    // Validierung
    if (!projectData.cust || projectData.cust <= 0) {
      return res.status(400).json({ message: 'Kundennummer muss größer als 0 sein.' });
    }
    
    if (!projectData.pname) {
      return res.status(400).json({ message: 'Projektname darf nicht leer sein.' });
    }
    
    // Unterprojekte validieren
    if (projectData.subproj) {
      try {
        projectService.validateSubprojects(projectData.subproj);
      } catch (validationError) {
        return res.status(400).json({ message: validationError.message });
      }
    }
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    const newProject = await projectService.createProject(projectData, username);
    res.status(201).json(newProject);
  } catch (error) {
    console.error('Fehler bei der Erstellung des Projekts:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Projekt aktualisieren
exports.updateProject = async (req, res) => {
  try {
    const cust = parseInt(req.params.cust);
    const lnr = parseInt(req.params.lnr);
    const projectData = req.body;
    
    // Unterprojekte validieren
    if (projectData.subproj !== undefined) {
      try {
        projectService.validateSubprojects(projectData.subproj);
      } catch (validationError) {
        return res.status(400).json({ message: validationError.message });
      }
    }
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    const updatedProject = await projectService.updateProject(cust, lnr, projectData, username);
    
    if (!updatedProject) {
      return res.status(404).json({ message: `Projekt für Kunde ${cust} mit LNR ${lnr} wurde nicht gefunden.` });
    }
    
    res.json(updatedProject);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Projekts:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Projekt löschen
exports.deleteProject = async (req, res) => {
  try {
    const cust = parseInt(req.params.cust);
    const lnr = parseInt(req.params.lnr);
    
    try {
      const deleted = await projectService.deleteProject(cust, lnr);
      
      if (!deleted) {
        return res.status(404).json({ message: `Projekt für Kunde ${cust} mit LNR ${lnr} wurde nicht gefunden.` });
      }
      
      res.json({ message: `Projekt für Kunde ${cust} mit LNR ${lnr} wurde erfolgreich gelöscht.` });
    } catch (error) {
      if (error.message.includes('kann nicht gelöscht werden')) {
        return res.status(409).json({ message: error.message });
      }
      throw error;
    }
  } catch (error) {
    console.error('Fehler beim Löschen des Projekts:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};