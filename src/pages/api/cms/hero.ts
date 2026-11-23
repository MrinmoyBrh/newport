import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';
import { getHeroContent, saveHeroDraft, publishHero } from '../../../lib/content';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const user = await getSessionUser(cookies);
  const includeDraft = url.searchParams.get('draft') === 'true' && Boolean(user);
  const hero = await getHeroContent(!includeDraft);
  return new Response(JSON.stringify(hero), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const action = body.action || 'draft'; // 'draft' or 'publish'

    if (action === 'publish') {
      if (body.data) {
        await saveHeroDraft(body.data, user.id);
      }
      await publishHero(user.id);
      return new Response(JSON.stringify({ success: true, message: 'Hero Section published successfully!' }), {
        status: 200,
      });
    } else {
      await saveHeroDraft(body.data, user.id);
      return new Response(JSON.stringify({ success: true, message: 'Hero draft saved.' }), {
        status: 200,
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to save hero' }), { status: 500 });
  }
};
