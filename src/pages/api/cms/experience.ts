import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';
import { getExperiences, saveExperience, deleteExperience } from '../../../lib/content';

export const prerender = false;

export const GET: APIRoute = async () => {
  const exps = await getExperiences(false);
  return new Response(JSON.stringify(exps), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const body = await request.json();
    if (!body.company || !body.role || !body.period) {
      return new Response(JSON.stringify({ error: 'Role, organization, and period are required.' }), { status: 400 });
    }

    await saveExperience(body, user.id);
    return new Response(JSON.stringify({ success: true, message: 'Experience saved.' }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ url, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });

  await deleteExperience(id, user.id);
  return new Response(JSON.stringify({ success: true, message: 'Experience deleted.' }), { status: 200 });
};
