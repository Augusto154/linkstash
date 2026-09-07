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
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json({ limit: '1mb' }));

interface AuthRequest extends Request { userId?: string }
const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try { req.userId = (jwt.verify(header.slice(7), jwtSecret) as { userId: string }).userId; next(); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
};
const publicUser = (r:any) => ({ id:r.id, username:r.username, email:r.email, displayName:r.display_name, bio:r.bio, avatar:r.avatar });

app.get('/api/health', async (_req,res) => { try { await pool.query('SELECT 1'); res.json({ok:true,service:'linkstash-api'}); } catch { res.status(503).json({ok:false}); } });

app.post('/api/auth/register', async (req,res) => {
  try {
    const username=String(req.body.username||'').trim().toLowerCase(), email=String(req.body.email||'').trim().toLowerCase(), password=String(req.body.password||''), displayName=String(req.body.displayName||username).trim();
    if(!/^[a-z0-9_]{3,50}$/.test(username)||!email.includes('@')||password.length<6) return res.status(400).json({error:'Dados de cadastro inválidos'});
    if((await pool.query('SELECT id FROM users WHERE email=$1 OR username=$2',[email,username])).rowCount) return res.status(409).json({error:'Email ou usuário já cadastrado'});
    const r=await pool.query('INSERT INTO users(username,email,password_hash,display_name) VALUES($1,$2,$3,$4) RETURNING id,username,email,display_name,bio,avatar',[username,email,await bcrypt.hash(password,12),displayName]);
    const user=r.rows[0]; res.status(201).json({user:publicUser(user),token:jwt.sign({userId:user.id},jwtSecret,{expiresIn:'7d'})});
  } catch { res.status(500).json({error:'Falha ao criar conta'}); }
});

app.post('/api/auth/login', async (req,res) => {
  try { const email=String(req.body.email||'').trim().toLowerCase(), password=String(req.body.password||''); const r=await pool.query('SELECT * FROM users WHERE email=$1',[email]); if(!r.rowCount||!(await bcrypt.compare(password,r.rows[0].password_hash))) return res.status(401).json({error:'Email ou senha inválidos'}); const user=r.rows[0]; res.json({user:publicUser(user),token:jwt.sign({userId:user.id},jwtSecret,{expiresIn:'7d'})}); }
  catch { res.status(500).json({error:'Falha no login'}); }
});

app.get('/api/me',auth,async(req:AuthRequest,res)=>{const r=await pool.query('SELECT id,username,email,display_name,bio,avatar FROM users WHERE id=$1',[req.userId]);if(!r.rowCount)return res.status(404).json({error:'Usuário não encontrado'});res.json(publicUser(r.rows[0]));});
app.patch('/api/me',auth,async(req:AuthRequest,res)=>{const r=await pool.query('UPDATE users SET display_name=COALESCE($1,display_name),bio=COALESCE($2,bio),avatar=COALESCE($3,avatar),updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING id,username,email,display_name,bio,avatar',[req.body.displayName,req.body.bio,req.body.avatar,req.userId]);res.json(publicUser(r.rows[0]));});
app.get('/api/links',auth,async(req:AuthRequest,res)=>{const r=await pool.query('SELECT id,title,url,description,icon,link_order AS "order",clicks,created_at AS "createdAt" FROM links WHERE user_id=$1 ORDER BY link_order,created_at DESC',[req.userId]);res.json(r.rows);});
app.post('/api/links',auth,async(req:AuthRequest,res)=>{const title=String(req.body.title||'').trim(),url=String(req.body.url||'').trim(),description=String(req.body.description||'').trim();if(!title||!/^https?:\/\//i.test(url))return res.status(400).json({error:'Título e URL HTTP/HTTPS são obrigatórios'});const r=await pool.query('INSERT INTO links(user_id,title,url,description,icon,link_order) VALUES($1,$2,$3,$4,$5,(SELECT COALESCE(MAX(link_order),0)+1 FROM links WHERE user_id=$1)) RETURNING id,title,url,description,icon,link_order AS "order",clicks,created_at AS "createdAt"',[req.userId,title,url,description||null,req.body.icon||'link']);res.status(201).json(r.rows[0]);});
app.patch('/api/links/:id',auth,async(req:AuthRequest,res)=>{const r=await pool.query('UPDATE links SET title=COALESCE($1,title),url=COALESCE($2,url),description=COALESCE($3,description),icon=COALESCE($4,icon),updated_at=CURRENT_TIMESTAMP WHERE id=$5 AND user_id=$6 RETURNING id,title,url,description,icon,link_order AS "order",clicks,created_at AS "createdAt"',[req.body.title,req.body.url,req.body.description,req.body.icon,req.params.id,req.userId]);if(!r.rowCount)return res.status(404).json({error:'Link não encontrado'});res.json(r.rows[0]);});
app.delete('/api/links/:id',auth,async(req:AuthRequest,res)=>{const r=await pool.query('DELETE FROM links WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.userId]);if(!r.rowCount)return res.status(404).json({error:'Link não encontrado'});res.status(204).end();});

app.get('/api/public/:username',async(req,res)=>{const r=await pool.query('SELECT u.username,u.display_name,u.bio,u.avatar,l.id,l.title,l.url,l.description,l.icon,l.link_order FROM users u LEFT JOIN links l ON l.user_id=u.id WHERE u.username=$1 ORDER BY l.link_order,l.created_at DESC',[String(req.params.username).toLowerCase()]);if(!r.rowCount)return res.status(404).json({error:'Perfil não encontrado'});const f=r.rows[0];res.json({username:f.username,displayName:f.display_name,bio:f.bio,avatar:f.avatar,links:r.rows.filter((x:any)=>x.id).map((x:any)=>({id:x.id,title:x.title,url:x.url,description:x.description,icon:x.icon}))});});
app.get('/api/go/:id',async(req,res)=>{try{const r=await pool.query('SELECT url FROM links WHERE id=$1',[req.params.id]);if(!r.rowCount)return res.status(404).send('Link não encontrado');await pool.query('UPDATE links SET clicks=clicks+1 WHERE id=$1',[req.params.id]);await pool.query('INSERT INTO analytics(link_id,user_agent,ip_address,referrer) VALUES($1,$2,$3,$4)',[req.params.id,String(req.headers['user-agent']||'').slice(0,500),String(req.ip||'').slice(0,45),String(req.headers.referer||'').slice(0,2048)]);res.redirect(r.rows[0].url);}catch{res.status(500).send('Erro ao abrir link');}});
app.get('/api/analytics',auth,async(req:AuthRequest,res)=>{const r=await pool.query('SELECT l.id,l.title,l.clicks,COUNT(a.id)::int AS "trackedClicks" FROM links l LEFT JOIN analytics a ON a.link_id=l.id WHERE l.user_id=$1 GROUP BY l.id ORDER BY l.clicks DESC',[req.userId]);res.json(r.rows);});
app.use((_req,res)=>res.status(404).json({error:'Not found'}));
app.listen(port,()=>console.log(`LinkStash API listening on ${port}`));
