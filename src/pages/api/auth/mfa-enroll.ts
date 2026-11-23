import type { APIRoute } from 'astro';
import { getSessionUser, startMfaEnrollment, confirmMfaEnrollment, disableMfa } from '../../../lib/auth';

export const prerender = false;

// GET: Check MFA status
export const GET: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  return new Response(JSON.stringify({ enabled: Boolean(user.mfa_enabled) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST: Start enrollment -> returns secret, URI, and 8 recovery codes
export const POST: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const enrollment = await startMfaEnrollment(user.id);
    return new Response(JSON.stringify({ success: true, ...enrollment }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to start MFA enrollment' }), { status: 500 });
  }
};

// PUT: Confirm enrollment with 6-digit TOTP code
export const PUT: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { token } = body;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Verification code is required.' }), { status: 400 });
    }

    const result = await confirmMfaEnrollment(user.id, token);
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error || 'Invalid code' }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, message: 'Two-factor authentication activated successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Verification failed' }), { status: 500 });
  }
};

// DELETE: Disable MFA with password confirmation
export const DELETE: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { password } = body;
    if (!password) {
      return new Response(JSON.stringify({ error: 'Password confirmation required.' }), { status: 400 });
    }

    const result = await disableMfa(user.id, password);
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error || 'Failed to disable MFA' }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, message: 'Two-factor authentication disabled.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to disable MFA' }), { status: 500 });
  }
};
