import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

const app = express();
const port = Number(process.env.API_PORT || 5000);
const jwtSecret = process.env.JWT_SECRET || 'change-me-in-production';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

interface AuthRequest extends Request { userId?: string }
const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'linkstash-api' }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password || password.length < 6) return res.status(400).json({ error: 'Invalid registration data' });
    const exists = await pool.query('SELECT id FROM users WHERE email=$1 OR username=$2', [email, username]);
    if (exists.rowCount) return res.status(409).json({ error: 'User already exists' });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query('INSERT INTO users (username,email,password_hash,display_name) VALUES ($1,$2,$3,$4) RETURNING id,username,email,display_name,bio,avatar', [username,email,hash,displayName || username]);
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch { res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!result.rowCount || !(await bcrypt.compare(password || '', result.rows[0].password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' });
    res.json({ user: { id:user.id,username:user.username,email:user.email,displayName:user.display_name,bio:user.bio,avatar:user.avatar }, token });
  } catch { res.status(500).json({ error: 'Login failed' }); }
});

app.get('/api/me', auth, async (req: AuthRequest, res) => {
  const result = await pool.query('SELECT id,username,email,display_name AS "displayName",bio,avatar FROM users WHERE id=$1', [req.userId]);
  if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
});

app.get('/api/links', auth, async (req: AuthRequest, res) => {
  const result = await pool.query('SELECT id,title,url,description,icon,link_order AS "order",clicks,created_at AS "createdAt" FROM links WHERE user_id=$1 ORDER BY link_order,created_at DESC', [req.userId]);
  res.json(result.rows);
});

app.post('/api/links', auth, async (req: AuthRequest, res) => {
  const { title, url, description, icon } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'Title and URL are required' });
  const result = await pool.query('INSERT INTO links (user_id,title,url,description,icon,link_order) VALUES ($1,$2,$3,$4,$5,(SELECT COALESCE(MAX(link_order),0)+1 FROM links WHERE user_id=$1)) RETURNING id,title,url,description,icon,link_order AS "order",clicks,created_at AS "createdAt"', [req.userId,title,url,description || null,icon || 'link']);
  res.status(201).json(result.rows[0]);
});

app.patch('/api/links/:id', auth, async (req: AuthRequest, res) => {
  const { title, url, description, icon } = req.body;
  const result = await pool.query('UPDATE links SET title=COALESCE($1,title),url=COALESCE($2,url),description=COALESCE($3,description),icon=COALESCE($4,icon),updated_at=CURRENT_TIMESTAMP WHERE id=$5 AND user_id=$6 RETURNING id,title,url,description,icon,link_order AS "order",clicks,created_at AS "createdAt"', [title,url,description,icon,req.params.id,req.userId]);
  if (!result.rowCount) return res.status(404).json({ error: 'Link not found' });
  res.json(result.rows[0]);
});

app.delete('/api/links/:id', auth, async (req: AuthRequest, res) => {
  const result = await pool.query('DELETE FROM links WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id,req.userId]);
  if (!result.rowCount) return res.status(404).json({ error: 'Link not found' });
  res.status(204).end();
});

app.patch('/api/me', auth, async (req: AuthRequest, res) => {
  const { displayName, bio, avatar } = req.body;
  const result = await pool.query('UPDATE users SET display_name=COALESCE($1,display_name),bio=COALESCE($2,bio),avatar=COALESCE($3,avatar),updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING id,username,email,display_name AS "displayName",bio,avatar', [displayName,bio,avatar,req.userId]);
  res.json(result.rows[0]);
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.listen(port, () => console.log(`LinkStash API listening on ${port}`));
