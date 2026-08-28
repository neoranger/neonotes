import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db/database.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Registro de usuario
router.post('/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const passwordRules = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  if (!passwordRules.test(password)) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 8 caracteres e incluir letras y números'
    });
  }

  try {
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      console.warn(`Intento de registro con usuario/email ya existente: ${username} / ${email}`);
      return res.status(400).json({ error: 'El registro no se pudo completar' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const id = crypto.randomUUID();
    const created_at = Date.now();

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, username, email, password_hash, created_at);

    const user = { id, username, email };
    const token = generateToken(user);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user,
      token
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error del servidor al registrar usuario' });
  }
});

// Login de usuario
router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const userData = { id: user.id, username: user.username, email: user.email };
    const token = generateToken(userData);

    res.json({
      message: 'Inicio de sesión exitoso',
      user: userData,
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Obtener usuario actual
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
