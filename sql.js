// api/sql.js — Vercel Serverless Function (CommonJS)
// Proxy tra il browser e Neon Postgres.
// Le credenziali Neon vengono lette dalle variabili d'ambiente di Vercel,
// non sono mai esposte al browser.

module.exports = async function handler(req, res) {

  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { query, params = [] } = req.body || {};

  if (!query) {
    return res.status(400).json({ message: 'Campo "query" mancante nel body' });
  }

  // Credenziali dalle variabili d'ambiente di Vercel
  const host = process.env.NEON_HOST;
  const user = process.env.NEON_USER;
  const pass = process.env.NEON_PASS;
  const db   = process.env.NEON_DB || 'neondb';

  if (!host || !user || !pass) {
    return res.status(500).json({
      message:
        'Variabili ambiente mancanti. ' +
        'Vai su Vercel → Settings → Environment Variables e aggiungi ' +
        'NEON_HOST, NEON_USER, NEON_PASS, NEON_DB, poi fai Redeploy.'
    });
  }

  // Usa l'endpoint diretto (senza -pooler) per l'API HTTP
  const directHost = host.replace('-pooler', '');
  const auth       = Buffer.from(`${user}:${pass}`).toString('base64');
  const connStr    = `postgresql://${user}:${pass}@${directHost}/${db}?sslmode=require`;

  try {
    const neonRes = await fetch(`https://${directHost}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type':           'application/json',
        'Authorization':          'Basic ' + auth,
        'Neon-Connection-String': connStr,
      },
      body: JSON.stringify({ query, params }),
    });

    const data = await neonRes.json();
    return res.status(neonRes.status).json(data);

  } catch (e) {
    return res.status(502).json({ message: 'Errore connessione Neon: ' + e.message });
  }
};
