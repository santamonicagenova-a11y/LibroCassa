// api/sql.js — Vercel Serverless Function (CommonJS)
// Proxy sicuro tra browser e Neon Postgres HTTP API.
 
module.exports.config = {
  api: { bodyParser: true },
};
 
module.exports = async function handler(req, res) {
 
  // ── CORS ──────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
 
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
 
  // ── Body parsing robusto ──────────────────────────────
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
        'Aggiungi NEON_HOST, NEON_USER, NEON_PASS, NEON_DB e fai Redeploy.',
    });
  }
 
  // ── Encoding sicuro delle credenziali ────────────────
  // encodeURIComponent gestisce caratteri speciali (@, #, !, ecc.)
  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(pass);
  const connStr = `postgresql://${encodedUser}:${encodedPass}@${host}/${db}?sslmode=require`;
 
  // Basic Auth: valori RAW perché Base64 li gestisce nativamente
  const auth = Buffer.from(`${user}:${pass}`).toString('base64');
 
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
 
