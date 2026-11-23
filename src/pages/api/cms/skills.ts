import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';
import { getFullSkillsMatrix, saveSkill, deleteSkill } from '../../../lib/content';

export const prerender = false;

export const GET: APIRoute = async () => {
  const matrix = await getFullSkillsMatrix();
  return new Response(JSON.stringify(matrix), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const body = await request.json();
    if (!body.name || !body.category_id) {
      return new Response(JSON.stringify({ error: 'Skill name and category are required.' }), { status: 400 });
    }

    await saveSkill(body, user.id);
    return new Response(JSON.stringify({ success: true, message: 'Skill saved.' }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ url, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });

  await deleteSkill(id, user.id);
  return new Response(JSON.stringify({ success: true, message: 'Skill deleted.' }), { status: 200 });
};
