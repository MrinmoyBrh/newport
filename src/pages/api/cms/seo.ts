import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';
import { getSeoSettings, saveSeoSettings } from '../../../lib/content';

export const prerender = false;

export const GET: APIRoute = async () => {
  const seo = await getSeoSettings();
  return new Response(JSON.stringify(seo), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const data = await request.json();
    await saveSeoSettings(data, user.id);
    return new Response(JSON.stringify({ success: true, message: 'SEO settings updated.' }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
