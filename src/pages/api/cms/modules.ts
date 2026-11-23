import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';
import { getModuleConfig, saveModuleConfig } from '../../../lib/content';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const key = url.searchParams.get('key');
  if (!key) return new Response(JSON.stringify({ error: 'Key required' }), { status: 400 });

  const data = await getModuleConfig(key);
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const { key, data } = await request.json();
    if (!key || !data) return new Response(JSON.stringify({ error: 'Key and data required' }), { status: 400 });

    await saveModuleConfig(key, data, user.id);
    return new Response(JSON.stringify({ success: true, message: `${key} settings updated successfully!` }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
