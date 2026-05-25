export async function onRequestGet({ env, params }) {
  const key = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');
  if (!key) return new Response('Not Found', { status: 404 });

  const object = await env.MEDIA.get(key);
  if (!object) return new Response('Not Found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('accept-ranges', 'bytes');

  return new Response(object.body, { headers });
}
