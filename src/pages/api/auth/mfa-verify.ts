import type { APIRoute } from 'astro';
import { verifyMfaLogin } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const body = await request.json();
    const { mfaToken, code } = body;

    if (!mfaToken || !code) {
      return new Response(JSON.stringify({ error: 'MFA token and verification code are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ip = clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await verifyMfaLogin(mfaToken, code, cookies, ip, userAgent);

    if (!result.success || !result.user) {
      return new Response(JSON.stringify({ error: result.error || 'Verification failed.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, user: result.user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Server authentication error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
