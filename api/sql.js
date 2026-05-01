// api/sql.js — Vercel Serverless Function (CommonJS)
// Proxy sicuro tra browser e Neon Postgres HTTP API.
// Le credenziali non vengono mai esposte al browser.
 
// Dice esplicitamente a Vercel di parsare il body JSON
module.exports.config = {
  api: { bodyParser: true },
};
 
module.exports = async function handler(req, res) {
 
  // ── CORS ──────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
 
  // ── Metodo ────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
 
  // ── Body parsing robusto ──────────────────────────────
  // Vercel di solito parsa automaticamente, ma per sicurezza gestiamo
  // anche il caso in cui il body arrivi come stringa grezza.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};
 
  const { query, params = [] } = body;
 
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({
      message: 'Campo "query" mancante o vuoto nel body JSON.',
      received: JSON.stringify(body).slice(0, 200),
    });
  }
 
  // ── Variabili d'ambiente ──────────────────────────────
  const host = process.env.NEON_HOST;
  const user = process.env.NEON_USER;
  const pass = process.env.NEON_PASS;
  const db   = process.env.NEON_DB || 'neondb';
 
  if (!host || !user || !pass) {
    return res.status(500).json({
      message:
        'Variabili ambiente mancanti su Vercel. ' +
        'Vai su Vercel → Settings → Environment Variables e aggiungi ' +
        'NEON_HOST, NEON_USER, NEON_PASS, NEON_DB — poi fai Redeploy.',
    });
  }
 
  // ── Chiamata a Neon HTTP API ──────────────────────────
  const auth    = Buffer.from(`${user}:${pass}`).toString('base64');
  const connStr = `postgresql://${user}:${pass}@${host}/${db}?sslmode=require`;
 
  try {
    const neonRes = await fetch(`https://${host}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type':           'application/json',
        'Authorization':          'Basic ' + auth,
        'Neon-Connection-String': connStr,
      },
      body: JSON.stringify({ query: query.trim(), params }),
    });
 
    const data = await neonRes.json();
    return res.status(neonRes.status).json(data);
 
  } catch (e) {
    return res.status(502).json({
      message: 'Impossibile raggiungere Neon: ' + e.message,
    });
  }
};
 
