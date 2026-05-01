import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = '24h';

// ── REGISTER ────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { username, email, password, confirm_password } = req.body;

    // Validation
    if (!username || !email || !password || !confirm_password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check duplicates
    const existingUsers = await db.all(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existingUsers.length > 0) {
      const byUsername = await db.get('SELECT id FROM users WHERE username = ?', [username]);
      if (byUsername) return res.status(400).json({ error: 'Username already exists' });
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user
    const result = await db.run(
      'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 0]
    );

    const userId = result.lastID;
    const token = jwt.sign(
      { id: userId, username, email, is_admin: false },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      user: { id: userId, username, email, is_admin: false },
      token,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
};

// ── LOGIN ────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const rows = await db.all('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, is_admin: !!user.is_admin },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: !!user.is_admin,
        created_at: user.created_at,
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed: ' + err.message });
  }
};

// ── GET CURRENT USER ─────────────────────────────────────────────────────────
export const me = async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, username, email, is_admin, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: err.message });
  }
};
