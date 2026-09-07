import { Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';

export class AuthController {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async register(req: any, res: Response) {
    try {
      const { username, email, password, displayName } = req.body;

      // Check if user exists
      const existingUser = await this.pool.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const result = await this.pool.query(
        'INSERT INTO users (username, email, password_hash, display_name) VALUES ($1, $2, $3, $4) RETURNING id, username, email, display_name',
        [username, email, passwordHash, displayName]
      );

      const user = result.rows[0];
      const token = generateToken(user.id);

      res.status(201).json({
        user,
        token,
      });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  async login(req: any, res: Response) {
    try {
      const { email, password } = req.body;

      const result = await this.pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken(user.id);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
        },
        token,
      });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  }
}
