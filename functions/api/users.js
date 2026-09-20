// Cloudflare Pages Function: /api/users
// Interacts with Cloudflare D1 SQL database (env.DB)

export async function onRequestGet(context) {
  const { env } = context;

  if (env && env.DB) {
    try {
      const { results } = await env.DB.prepare(
        'SELECT id, name, email, role, trust_score, active_trip_id, created_at FROM users ORDER BY trust_score DESC'
      ).all();

      return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  // Fallback if D1 is not bound
  return new Response(JSON.stringify([
    { id: 1, name: 'Aarav Sharma', email: 'aarav.s2025@iimbg.ac.in', role: 'student', trust_score: 98.5 },
    { id: 2, name: 'Priya Patel', email: 'priya.p2025@iimbg.ac.in', role: 'student', trust_score: 92.0 },
    { id: 3, name: 'Rohan Verma', email: 'rohan.v2025@iimbg.ac.in', role: 'student', trust_score: 100.0 },
    { id: 4, name: 'Campus Fleet Admin', email: 'admin@iimbg.ac.in', role: 'admin', trust_score: 100.0 }
  ]), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  try {
    const body = await request.json();

    // Check if adjusting trust score: /api/users?action=adjust-trust
    if (url.searchParams.get('action') === 'adjust-trust' || body.action === 'adjust-trust') {
      const { userId, newScore, delta } = body;
      const score = typeof newScore === 'number' ? newScore : 100.0;

      if (env && env.DB) {
        await env.DB.prepare(
          'UPDATE users SET trust_score = ? WHERE id = ?'
        ).bind(Math.min(100.0, Math.max(0.0, score)), userId).run();
      }

      return new Response(JSON.stringify({ success: true, userId, trust_score: score }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // SSO Login / Create User with domain check
    const email = (body.email || '').trim().toLowerCase();
    const name = (body.name || '').trim() || email.split('@')[0];

    if (!email.endsWith('@iimbg.ac.in')) {
      return new Response(JSON.stringify({ error: 'Access Restricted: Only @iimbg.ac.in email accounts are permitted.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const role = email.startsWith('admin@') ? 'admin' : 'student';

    if (env && env.DB) {
      let user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
      if (!user) {
        const info = await env.DB.prepare(
          'INSERT INTO users (name, email, role, trust_score) VALUES (?, ?, ?, 100.0)'
        ).bind(name, email, role).run();
        user = { id: info.meta.last_row_id, name, email, role, trust_score: 100.0 };
      }
      return new Response(JSON.stringify(user), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fallback user object
    return new Response(JSON.stringify({
      id: Date.now(),
      name,
      email,
      role,
      trust_score: 100.0
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
