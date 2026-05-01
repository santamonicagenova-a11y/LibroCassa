// api/sql.js — Vercel Serverless Function (CommonJS)
module.exports.config = {
  api: { bodyParser: true },
};
 
module.exports = async function handler(req, res) {
 
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
 
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
 
  // ── Body parsing ──────────────────────────────────────
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  if (!body || typeof body !== 'object') body = {};
 
  // ── Debug mode ────────────────────────────────────────
  const host = process.env.NEON_HOST;
  const user = process.env.NEON_USER;
  const pass = process.env.NEON_PASS;
  const db   = process.env.NEON_DB || 'neondb';
 
  if (body.query === 'debug') {
    return res.status(200).json({
      NEON_HOST: host ? `✓ presente (${host.slice(0,20)}...)` : '✗ MANCANTE',
      NEON_USER: user ? `✓ presente (${user})` : '✗ MANCANTE',
      NEON_PASS: pass ? `✓ presente (${pass.length} caratteri)` : '✗ MANCANTE',
      NEON_DB:   db   ? `✓ presente (${db})` : '✗ MANCANTE',
    });
  }
 
  const { query, params = [] } = body;
 
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({
      message: 'Campo "query" mancante o vuoto.',
      received: JSON.stringify(body).slice(0, 200),
    });
  }
 
  if (!host || !user || !pass) {
    return res.status(500).json({
      message: 'Variabili ambiente mancanti. Aggiungi NEON_HOST, NEON_USER, NEON_PASS, NEON_DB su Vercel e fai Redeploy.',
    });
  }
 
  // ── Connection string con credenziali encoded ─────────
  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(pass);
  const connStr = `postgresql://${encodedUser}:${encodedPass}@${host}/${db}?sslmode=require`;
 
  try {
    const neonRes = await fetch(`https://${host}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type':           'application/json',
        'Neon-Connection-String': connStr,
        // Neon HTTP API: autenticazione tramite connection string nell'header,
        // senza Basic Auth separato
      },
      body: JSON.stringify({ query: query.trim(), params }),
    });
 
    const data = await neonRes.json();
    return res.status(neonRes.status).json(data);
 
  } catch (e) {
    return res.status(502).json({ message: 'Impossibile raggiungere Neon: ' + e.message });
  }
};
