import type { APIRoute } from 'astro';
import { getSessionUser, updateAdminPassword, createSession } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return new Response(JSON.stringify({ error: 'All fields are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (newPassword !== confirmPassword) {
      return new Response(JSON.stringify({ error: 'New passwords do not match.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (newPassword.length < 12) {
      return new Response(JSON.stringify({ error: 'New password must be at least 12 characters long.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await updateAdminPassword(user.id, currentPassword, newPassword);
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error || 'Failed to update password' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Refresh current session with a new token after invalidating all others
    const userAgent = request.headers.get('user-agent') || undefined;
    await createSession(user.id, cookies, userAgent, clientAddress);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password successfully updated. All other active sessions have been revoked.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
