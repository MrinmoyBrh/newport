import { defineMiddleware } from 'astro:middleware';
import { getSessionUser, getAdminUserCount } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    const { pathname } = context.url;
    const method = context.request.method.toUpperCase();

    // 1. Initial Setup Guard
    if (pathname === '/admin/setup' || pathname === '/api/auth/setup') {
      try {
        const adminCount = await getAdminUserCount();
        if (adminCount > 0) {
          if (pathname.startsWith('/api/')) {
            return new Response(JSON.stringify({ error: 'Setup is locked. An administrator already exists.' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return context.redirect('/admin/login');
        }
      } catch (err) {
        console.error('[Middleware Error] Setup guard DB check failed:', err);
        if (pathname.startsWith('/api/')) {
          return new Response(JSON.stringify({ error: 'Database service unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return context.redirect('/admin/login?error=db_error');
      }
    }

    // 2. CSRF Defense for mutating API requests (POST, PUT, DELETE, PATCH)
    if (pathname.startsWith('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      // Exclude public endpoints if any (all currently mutating endpoints are admin/auth)
      const origin = context.request.headers.get('origin');
      const referer = context.request.headers.get('referer');
      const host = context.request.headers.get('host');

      if (origin || referer) {
        const sourceUrl = origin || referer;
        try {
          const parsedSource = new URL(sourceUrl!);
          if (host && !parsedSource.host.toLowerCase().includes(host.toLowerCase())) {
            return new Response(JSON.stringify({ error: 'Cross-Site Request Forgery (CSRF) check failed: Untrusted Origin.' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        } catch {
          return new Response(JSON.stringify({ error: 'Malformed Origin/Referer header.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // 3. Centralized API Guard for all /api/cms/* mutating routes
    if (pathname.startsWith('/api/cms') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      try {
        const user = await getSessionUser(context.cookies);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized: Administrative authentication required.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (err) {
        console.error('[Middleware Error] CMS API guard DB check failed:', err);
        return new Response(JSON.stringify({ error: 'Database authentication check failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 4. Centralized Admin Page Guard for /admin/* (except login & setup)
    if (pathname.startsWith('/admin') && pathname !== '/admin/login' && pathname !== '/admin/setup') {
      try {
        const user = await getSessionUser(context.cookies);
        if (!user) {
          return context.redirect('/admin/login');
        }
      } catch (err) {
        console.error('[Middleware Error] Admin page guard DB check failed:', err);
        return context.redirect('/admin/login?error=db_error');
      }
    }

    // Execute route handler
    const response = await next();

    // If the response is a redirect (status 3xx), its headers are immutable in modern fetch/Node.
    // Return redirect responses immediately without modifying headers.
    if (response.status >= 300 && response.status < 400) {
      return response;
    }

    try {
      // 5. Cache-Control Security for Admin & CMS API routes (never cache sensitive data)
      if (pathname.startsWith('/admin') || pathname.startsWith('/api/cms') || pathname.startsWith('/api/auth')) {
        response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
      }

      // 6. Enterprise HTTP Security Headers (applied to all responses)
      response.headers.set(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob: https:",
          "connect-src 'self'",
          "frame-src 'self'",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')
      );

      response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
      response.headers.set('X-XSS-Protection', '1; mode=block');
    } catch (headerErr) {
      console.warn('[Middleware Warning] Could not set headers on response:', headerErr);
    }

    return response;
  } catch (fatalErr: any) {
    console.error('[Global Middleware Fatal Catch]', fatalErr);
    return new Response(
      `<!DOCTYPE html><html class="dark"><head><title>System Error</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="background:#111;color:#f5f5f5;font-family:sans-serif;padding:2rem;">` +
      `<h2 style="color:#9CAF88;">Service Temporarily Unavailable</h2>` +
      `<p>${fatalErr?.message || 'An unexpected error occurred.'}</p>` +
      `<p><a href="/admin/login" style="color:#9CAF88;text-decoration:underline;">← Retry Admin Login</a></p></body></html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
});
