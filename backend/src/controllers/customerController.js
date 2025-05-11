const customerService = require('../services/customerService');

exports.getAllCustomers = async (req, res) => {
    try {
        const customers = await customerService.getAllCustomers();
        res.json(customers);
    } catch (error) {
        console.error('Fehler beim Abrufen der Kunden:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
};

exports.getCustomerById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const customer = await customerService.getCustomerById(id);
        if (!customer) {
            return res.status(404).json({ message: `Kunde mit ID ${id} wurde nicht gefunden.` });
        }
        res.json(customer);
    }
    catch (error) {
        console.error('Fehler beim Abrufen des Kunden:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
};

exports.createCustomer = async (req, res) => {
    try {
      const customerData = req.body;
      
      // Validierung
      if (!customerData.vname) {
        return res.status(400).json({ message: 'Vorname darf nicht leer sein.' });
      }
      
      if (!customerData.nname) {
        return res.status(400).json({ message: 'Nachname darf nicht leer sein.' });
      }
      
      // Username aus dem Token für naid/aeid verwenden
      const username = req.user.username || 'system';
      
      const newCustomer = await customerService.createCustomer(customerData, username);
      res.status(201).json(newCustomer);
    } catch (error) {
      console.error('Fehler bei der Erstellung des Kunden:', error);
      res.status(500).json({ message: 'Interner Serverfehler' });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customerData = req.body;
      
      // Username aus dem Token für naid verwenden
      const username = req.user.username || 'system';
      
      const updatedCustomer = await customerService.updateCustomer(id, customerData, username);
      
      if (!updatedCustomer) {
        return res.status(404).json({ message: `Kunde mit ID ${id} wurde nicht gefunden.` });
      }
      
      res.json(updatedCustomer);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Kunden:', error);
      res.status(500).json({ message: 'Interner Serverfehler' });
    }
};

exports.deleteCustomer = async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await customerService.deleteCustomer(id);
      
      if (!deleted) {
        return res.status(404).json({ message: `Kunde mit ID ${id} wurde nicht gefunden.` });
      }
      
      res.json({ message: `Kunde mit ID ${id} wurde erfolgreich gelöscht.` });
    } catch (error) {
      console.error('Fehler beim Löschen des Kunden:', error);
      
      if (error.message.includes('verknüpft sind')) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Interner Serverfehler' });
    }
};