export async function onRequestPost({ request, env }) {
  try {
    const { password } = await request.json();
    const row = await env.DB.prepare(
      "SELECT value FROM admin_config WHERE key = 'password'"
    ).first();
    if (!row || password !== row.value) {
      return Response.json({ error: 'Invalid password' }, { status: 401 });
    }
    return Response.json({ token: btoa(password) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
