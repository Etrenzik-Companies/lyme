/**
 * GET /media/… — serves story photos out of R2.
 *
 * Only images attached to an APPROVED story are served. A photo uploaded with a story
 * that is still pending, or that was rejected, is not reachable by guessing its key.
 */
export async function onRequest({ params, env }) {
  const key = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  if (!key || !env.MEDIA) return new Response('Not found', { status: 404 });

  const allowed = await env.DB.prepare(
    `SELECT m.content_type
       FROM story_media m
       JOIN stories s ON s.id = m.story_id
      WHERE m.r2_key = ? AND s.status = 'approved'`
  ).bind(key).first();

  if (!allowed) return new Response('Not found', { status: 404 });

  const object = await env.MEDIA.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  return new Response(object.body, {
    headers: {
      'content-type': allowed.content_type || 'application/octet-stream',
      'cache-control': 'public, max-age=86400',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
    },
  });
}
