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

export async function onRequestPut({ request, env }) {
  if (!await verifyAuth(request, env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    /* single field update: { content_key, content_value } */
    if (body.content_key && typeof body.content_value === 'string') {
      const row = await env.DB.prepare(
        'SELECT max_chars FROM site_content WHERE content_key = ?'
      ).bind(body.content_key).first();
      if (!row) {
        return Response.json({ error: 'Unknown content key: ' + body.content_key }, { status: 404 });
      }
      if (body.content_value.length > row.max_chars) {
        return Response.json({
          error: 'Text exceeds design frame. Max ' + row.max_chars + ' characters. Current: ' + body.content_value.length + '.'
        }, { status: 422 });
      }
      await env.DB.prepare(
        'UPDATE site_content SET content_value = ? WHERE content_key = ?'
      ).bind(body.content_value, body.content_key).run();

      const updated = await env.DB.prepare(
        'SELECT content_key, content_value, max_chars FROM site_content WHERE content_key = ?'
      ).bind(body.content_key).first();
      return Response.json(updated);
    }

    /* bulk update: { updates: [{ content_key, content_value }, ...] } */
    if (Array.isArray(body.updates)) {
      const results = [];
      const errors = [];

      for (var i = 0; i < body.updates.length; i++) {
        var u = body.updates[i];
        if (!u.content_key || typeof u.content_value !== 'string') continue;
        try {
          const row = await env.DB.prepare(
            'SELECT max_chars FROM site_content WHERE content_key = ?'
          ).bind(u.content_key).first();
          if (!row) {
            errors.push({ content_key: u.content_key, error: 'Unknown key' });
            continue;
          }
          if (u.content_value.length > row.max_chars) {
            errors.push({
              content_key: u.content_key,
              error: 'Text exceeds design frame. Max ' + row.max_chars + ' characters. Current: ' + u.content_value.length + '.'
            });
            continue;
          }
          await env.DB.prepare(
            'UPDATE site_content SET content_value = ? WHERE content_key = ?'
          ).bind(u.content_value, u.content_key).run();
          results.push(u.content_key);
        } catch (e) {
          errors.push({ content_key: u.content_key, error: e.message });
        }
      }

      return Response.json({ saved: results, errors: errors });
    }

    return Response.json({ error: 'Expected content_key+content_value or updates array' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}