import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';
import { getAllMedia, saveMediaFile, deleteMedia } from '../../../lib/media';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const media = await getAllMedia();
  return new Response(JSON.stringify(media), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const altText = (formData.get('alt_text') as string) || '';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await saveMediaFile(buffer, file.name, file.type, altText);
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, media: result.media }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Media upload failed' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ url, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });

  const ok = await deleteMedia(id);
  if (!ok) return new Response(JSON.stringify({ error: 'Media asset not found' }), { status: 404 });

  return new Response(JSON.stringify({ success: true, message: 'Media removed.' }), { status: 200 });
};
