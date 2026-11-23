import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';
import { getRevisions, restoreRevision } from '../../../lib/content';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const entityType = url.searchParams.get('type') || undefined;
  const revisions = await getRevisions(entityType, 50);
  return new Response(JSON.stringify(revisions), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const { revisionId } = await request.json();
    if (!revisionId) return new Response(JSON.stringify({ error: 'revisionId is required' }), { status: 400 });

    const ok = await restoreRevision(revisionId, user.id);
    if (!ok) return new Response(JSON.stringify({ error: 'Revision not found or corrupted' }), { status: 404 });

    return new Response(JSON.stringify({ success: true, message: 'Revision restored successfully!' }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
