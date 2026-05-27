export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT content_key, content_value, max_chars, page, section, element_type FROM site_content ORDER BY content_key'
    ).all();
    const content = {};
    results.forEach(function (r) {
      content[r.content_key] = r.content_value;
    });
    return Response.json({ content: content, meta: results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}