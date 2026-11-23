import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';
import { getProjects, getProjectById, saveProject, deleteProject } from '../../../lib/content';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const user = await getSessionUser(cookies);
  const id = url.searchParams.get('id');
  const placement = url.searchParams.get('placement') || 'all';

  // Security: Unauthenticated callers must only ever receive published projects
  const publishedOnly = !user;

  if (id) {
    const project = await getProjectById(id);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 });
    if (publishedOnly && !project.is_published) {
      return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 });
    }
    return new Response(JSON.stringify(project), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const projects = await getProjects(placement, publishedOnly);
  return new Response(JSON.stringify(projects), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.title || !body.slug) {
      return new Response(JSON.stringify({ error: 'Project title and slug are required.' }), { status: 400 });
    }

    const id = await saveProject(body, user.id);
    return new Response(JSON.stringify({ success: true, id, message: 'Project saved successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to save project' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ url, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'Project ID is required' }), { status: 400 });

  await deleteProject(id, user.id);
  return new Response(JSON.stringify({ success: true, message: 'Project deleted.' }), { status: 200 });
};
