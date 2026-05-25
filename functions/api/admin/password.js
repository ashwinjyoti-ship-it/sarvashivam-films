async function verifyAuth(request, env) {
  const hdr = request.headers.get('Authorization') || '';
  const token = hdr.replace('Bearer ', '').trim();
  if (!token) return false;
  try {
    const pw = atob(token);
    const row = await env.DB.prepare(
      "SELECT value FROM admin_config WHERE key = 'password'"
    ).first();
    return !!(row && pw === row.value);
  } catch { return false; }
}

export async function onRequestPost({ request, env }) {
  if (!await verifyAuth(request, env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { newPassword } = await request.json();
  if (!newPassword || newPassword.length < 4) {
    return Response.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
  }
  await env.DB.prepare(
    "UPDATE admin_config SET value=? WHERE key='password'"
  ).bind(newPassword).run();
  return Response.json({ ok: true });
}
