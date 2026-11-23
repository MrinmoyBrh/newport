import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';
import { getAppearanceSettings, saveAppearanceDraft, publishAppearance } from '../../../lib/content';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const user = await getSessionUser(cookies);
  const includeDraft = url.searchParams.get('draft') === 'true' && Boolean(user);
  const data = await getAppearanceSettings(!includeDraft);
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const { action, data } = await request.json();
    if (action === 'publish') {
      if (data) await saveAppearanceDraft(data, user.id);
      await publishAppearance(user.id);
      return new Response(JSON.stringify({ success: true, message: 'Appearance settings published!' }), { status: 200 });
    } else {
      await saveAppearanceDraft(data, user.id);
      return new Response(JSON.stringify({ success: true, message: 'Appearance draft saved.' }), { status: 200 });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
