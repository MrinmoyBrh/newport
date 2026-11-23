import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../../lib/auth';
import { reorderProjects } from '../../../../lib/content';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { orderedIds } = await request.json();
    if (!Array.isArray(orderedIds)) {
      return new Response(JSON.stringify({ error: 'orderedIds array required' }), { status: 400 });
    }

    await reorderProjects(orderedIds, user.id);
    return new Response(JSON.stringify({ success: true, message: 'Projects reordered successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to reorder' }), { status: 500 });
  }
};
