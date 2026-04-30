// api/sql.js — Vercel Serverless Function
// Fa da proxy tra il browser e Neon Postgres.
// Le credenziali sono variabili d'ambiente di Vercel (non nel browser).

export default async function handler(req, res) {

  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { query, params = [] } = req.body;

  if (!query) {
    return res.status(400).json({ message: 'Campo "query" mancante' });
  }

  // Credenziali dalle variabili d'ambiente di Vercel
  const host = process.env.NEON_HOST;
  const user = process.env.NEON_USER;
  const pass = process.env.NEON_PASS;
  const db   = process.env.NEON_DB || 'neondb';

  if (!host || !user || !pass) {
    return res.status(500).json({
      message: 'Variabili ambiente Neon non configurate. ' +
               'Vai su Vercel → Settings → Environment Variables e aggiungi NEON_HOST, NEON_USER, NEON_PASS, NEON_DB.'
    });
  }

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
      body: JSON.stringify({ query, params }),
    });

    const data = await neonRes.json();
    return res.status(neonRes.status).json(data);

  } catch (e) {
    return res.status(502).json({ message: 'Errore connessione Neon: ' + e.message });
  }
}
