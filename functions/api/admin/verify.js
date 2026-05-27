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

export async function onRequestGet({ request, env }) {
  if (!await verifyAuth(request, env)) {
    return Response.json({ valid: false }, { status: 401 });
  }
  return Response.json({ valid: true });
}