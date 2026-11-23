import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { getSessionUser, hashSessionToken } from '../../../lib/auth';
import { getDb } from '../../../lib/db';

export const prerender = false;

// DELETE: Terminate all sessions except the current active session
export const DELETE: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = cookies.get('mb_cms_session')?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: 'No active session' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = getDb();
    const currentTokenHash = hashSessionToken(token);
    const legacyTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ? AND token_hash != ?').run(user.id, currentTokenHash, legacyTokenHash);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Revoked other active sessions.`,
        revokedCount: result.changes,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to revoke sessions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
