const bcrypt = require('bcrypt');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const config = require('../config/constants');

exports.findUserByUsername = async (username) => {
    const result = await db.query('SELECT * FROM "int".users WHERE username = $1', [username]);
    return result.rows[0];
};

exports.verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

exports.hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

exports.generateToken = (user) => {
    return jwt.sign({ id: user.id, role: user.role }, config.JWT_SECRET, { expiresIn: '1h' });
};

exports.registerUser = async (userData) => {
    const { username, password, role } = userData;
    const hashedPassword = await this.hashPassword(password);
    const result = await db.query('INSERT INTO "int".users (username, password, role) VALUES ($1, $2, $3) RETURNING *', [username, hashedPassword, role]);
    return result.rows[0];
};

exports.getUserById = async (userId) => {
    const result = await db.query('SELECT * FROM "int".users WHERE id = $1', [userId]);
    return result.rows[0];
};

exports.loginUser = async (username, password) => {
    const user = await this.findUserByUsername(username);
    if (!user) {
        return null;
    }
    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
        return null;
    }

    await db.query('UPDATE "int".users SET last_login = NOW() WHERE id = $1', [user.id]);

    return user;
}