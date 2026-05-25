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

export async function onRequestPut({ request, env, params }) {
  if (!await verifyAuth(request, env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slot = parseInt(params.slot, 10);
  if (!slot || slot < 1 || slot > 5) {
    return Response.json({ error: 'Invalid slot' }, { status: 400 });
  }

  const ct = request.headers.get('Content-Type') || '';

  if (ct.includes('multipart/form-data')) {
    const form = await request.formData();
    const title = (form.get('title') || '').trim();
    const description = (form.get('description') || '').trim();
    const category = form.get('category') || 'short-film';
    const file = form.get('file');

    if (file && file.size > 0) {
      const nameParts = (file.name || 'clip.mp4').split('.');
      const ext = nameParts[nameParts.length - 1].toLowerCase();
      if (!['mp4', 'mov'].includes(ext)) {
        return Response.json({ error: 'Only .mp4 and .mov files allowed' }, { status: 400 });
      }
      if (file.size > 200 * 1024 * 1024) {
        return Response.json({ error: 'File too large (max 200 MB)' }, { status: 400 });
      }
      const key = `slot-${slot}-${Date.now()}.${ext}`;
      const buffer = await file.arrayBuffer();
      await env.MEDIA.put(key, buffer, {
        httpMetadata: { contentType: file.type || 'video/mp4' }
      });
      await env.DB.prepare(
        'UPDATE films SET title=?, description=?, category=?, video_type=?, video_url=? WHERE slot=?'
      ).bind(title, description, category, 'upload', `/media/${key}`, slot).run();
    } else {
      await env.DB.prepare(
        'UPDATE films SET title=?, description=?, category=? WHERE slot=?'
      ).bind(title, description, category, slot).run();
    }
  } else {
    const body = await request.json();
    const { title = '', description = '', category = 'short-film', videoType, videoUrl } = body;

    if (videoType === 'youtube' && videoUrl) {
      await env.DB.prepare(
        'UPDATE films SET title=?, description=?, category=?, video_type=?, video_url=? WHERE slot=?'
      ).bind(title.trim(), description.trim(), category, 'youtube', videoUrl.trim(), slot).run();
    } else if (videoType === 'none') {
      await env.DB.prepare(
        'UPDATE films SET title=?, description=?, category=?, video_type=NULL, video_url=NULL WHERE slot=?'
      ).bind(title.trim(), description.trim(), category, slot).run();
    } else {
      await env.DB.prepare(
        'UPDATE films SET title=?, description=?, category=? WHERE slot=?'
      ).bind(title.trim(), description.trim(), category, slot).run();
    }
  }

  const updated = await env.DB.prepare('SELECT * FROM films WHERE slot=?').bind(slot).first();
  return Response.json(updated);
}
