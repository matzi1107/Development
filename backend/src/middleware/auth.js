const jwt = require('jsonwebtoken');
const config = require('../config/constants');

exports.verifyToken = (req, res, next) => {
    try{
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Token nicht gefunden' 
            });
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Token ungültig oder abgelaufen'
        });
    }
};

exports.CheckRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Benutzer nicht authentifiziert'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'unzureichende Berechtigung'
            });
        }
        next();
    };
};