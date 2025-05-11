const authService = require('../services/authService');

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await authService.loginUser(username, password);

        if (!user) {
            return res.status(401).json({ message: 'Benutzername oder Passwort ungültig' });
        }

        const token = authService.generateToken(user);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Fehler beim Login:', err);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
};

// Registrierungs-Controller
exports.register = async (req, res) => {
    const { username, password, role } = req.body;
    
    try {
        // Validierung
        const validRoles = ['admin', 'user'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Ungültige Rolle' });
        }
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Benutzername und Passwort sind erforderlich' });
        }
        
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ message: 'Benutzername muss zwischen 3 und 20 Zeichen lang sein' });
        }
        
        if (password.length < 6 || password.length > 20) {
            return res.status(400).json({ message: 'Passwort muss zwischen 6 und 20 Zeichen lang sein' });
        }
        
        if (!/^[a-zA-Z0-9]+$/.test(username)) {
            return res.status(400).json({ message: 'Benutzername darf nur Buchstaben und Zahlen enthalten' });
        }
        
        if (username.includes(' ') || password.includes(' ')) {
            return res.status(400).json({ message: 'Benutzername und Passwort dürfen keine Leerzeichen enthalten' });
        }
        
        if (username.toLowerCase() === password.toLowerCase()) {
            return res.status(400).json({ message: 'Benutzername und Passwort dürfen nicht identisch sein' });
        }
        
        if (['admin', 'root', 'administrator'].includes(username.toLowerCase())) {
            return res.status(400).json({ message: `Benutzername "${username}" ist nicht erlaubt` });
        }

        // Prüfen, ob Benutzer bereits existiert
        const existingUser = await authService.findUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ message: 'Benutzername bereits vergeben' });
        }
        
        // Benutzer registrieren
        const user = await authService.registerUser({ username, password, role });
        
        // Token generieren
        const token = authService.generateToken(user);
        
        // Erfolgreiche Antwort senden
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Fehler bei der Registrierung:', err);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
};