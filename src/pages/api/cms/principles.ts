import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';
import { getPrinciples, savePrinciple } from '../../../lib/content';

export const prerender = false;

export const GET: APIRoute = async () => {
  const p = await getPrinciples();
  return new Response(JSON.stringify(p), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const body = await request.json();
    await savePrinciple(body, user.id);
    return new Response(JSON.stringify({ success: true, message: 'Principle updated.' }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
