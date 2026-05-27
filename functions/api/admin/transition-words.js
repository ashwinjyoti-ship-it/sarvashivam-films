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
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, word, label FROM transition_words ORDER BY id'
    ).all();
    return Response.json(results);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  if (!await verifyAuth(request, env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const word = (body.word || '').trim();
    const label = (body.label || '').trim();
    if (!word) return Response.json({ error: 'word is required' }, { status: 400 });
    const result = await env.DB.prepare(
      'INSERT INTO transition_words (word, label) VALUES (?, ?)'
    ).bind(word, label).run();
    const row = await env.DB.prepare(
      'SELECT id, word, label FROM transition_words WHERE id = ?'
    ).bind(result.meta.last_row_id).first();
    return Response.json(row, { status: 201 });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      return Response.json({ error: 'Word already exists' }, { status: 409 });
    }
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestDelete({ request, env }) {
  if (!await verifyAuth(request, env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
    await env.DB.prepare('DELETE FROM transition_words WHERE id = ?').bind(id).run();
    return Response.json({ deleted: id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
