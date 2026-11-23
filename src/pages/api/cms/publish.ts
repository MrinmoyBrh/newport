import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';
import { publishHero, publishAppearance, logActivity } from '../../../lib/content';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const target = body.target || 'all';

    if (target === 'hero' || target === 'all') {
      await publishHero(user.id);
    }
    if (target === 'appearance' || target === 'all') {
      await publishAppearance(user.id);
    }

    await logActivity(user.id, 'PUBLISH_ALL', 'site', null, 'Published all pending CMS drafts to public website');

    return new Response(JSON.stringify({
      success: true,
      message: 'All changes successfully published to the live portfolio!',
      publishedAt: Date.now(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Publishing failed' }), { status: 500 });
  }
};
