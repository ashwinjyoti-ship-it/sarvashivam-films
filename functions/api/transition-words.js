export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT word FROM transition_words ORDER BY id'
    ).all();
    return Response.json(results.map(function (r) { return r.word; }));
  } catch (e) {
    return Response.json([], { status: 200 });
  }
}
