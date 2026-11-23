import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';
import { getDb } from '../../../lib/db';
import { logActivity } from '../../../lib/content';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const db = getDb();
  const backup = {
    version: '1.0.0',
    exported_at: Date.now(),
    exported_by: user.username,
    hero_content: await db.prepare('SELECT * FROM hero_content').all(),
    projects: await db.prepare('SELECT * FROM projects').all(),
    skill_categories: await db.prepare('SELECT * FROM skill_categories').all(),
    skills: await db.prepare('SELECT * FROM skills').all(),
    experiences: await db.prepare('SELECT * FROM experiences').all(),
    education: await db.prepare('SELECT * FROM education').all(),
    principles: await db.prepare('SELECT * FROM principles').all(),
    navigation_items: await db.prepare('SELECT * FROM navigation_items').all(),
    module_configs: await db.prepare('SELECT * FROM module_configs').all(),
    appearance_settings: await db.prepare('SELECT * FROM appearance_settings').all(),
    seo_settings: await db.prepare('SELECT * FROM seo_settings').all(),
  };

  return new Response(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="portfolio-cms-backup-${Date.now()}.json"`,
    },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const data = await request.json();
    if (!data.version || !data.projects || !data.hero_content) {
      return new Response(JSON.stringify({ error: 'Invalid backup file structure' }), { status: 400 });
    }

    const db = getDb();

    // Use transaction for restore
    await db.exec('BEGIN TRANSACTION;');
    try {
      if (Array.isArray(data.hero_content) && data.hero_content.length > 0) {
        await db.prepare('DELETE FROM hero_content').run();
        const insertHero = db.prepare(`
          INSERT INTO hero_content (
            id, name, role_badge, education_badge, college_badge,
            headline_line1, headline_highlight, headline_gradient,
            description, description_html,
            cta_primary_label, cta_primary_url,
            cta_secondary_label, cta_secondary_url,
            cta_terminal_label, cta_terminal_url,
            orbital_radar_top_left, orbital_radar_top_right,
            orbital_radar_bottom_left, orbital_radar_bottom_right,
            orbital_status_title, orbital_status_reliability, orbital_core_label,
            is_published, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const h of data.hero_content) {
          await insertHero.run(
            h.id, h.name, h.role_badge, h.education_badge, h.college_badge,
            h.headline_line1, h.headline_highlight, h.headline_gradient,
            h.description, h.description_html,
            h.cta_primary_label, h.cta_primary_url,
            h.cta_secondary_label, h.cta_secondary_url,
            h.cta_terminal_label, h.cta_terminal_url,
            h.orbital_radar_top_left, h.orbital_radar_top_right,
            h.orbital_radar_bottom_left, h.orbital_radar_bottom_right,
            h.orbital_status_title, h.orbital_status_reliability, h.orbital_core_label,
            h.is_published, h.updated_at
          );
        }
      }

      if (Array.isArray(data.projects)) {
        await db.prepare('DELETE FROM projects').run();
        const insertProj = db.prepare(`
          INSERT INTO projects (
            id, slug, title, tagline, category, role, organization, period,
            placement, featured, display_order, github_url, live_url,
            badges, summary, challenge, architecture_narrative,
            architecture_steps, technical_highlights, verified_claims, stack, key_features,
            cover_image, is_published, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of data.projects) {
          await insertProj.run(
            p.id, p.slug, p.title, p.tagline, p.category, p.role, p.organization || null, p.period,
            p.placement || 'showcase', p.featured ? 1 : 0, p.display_order || 0, p.github_url || null, p.live_url || null,
            typeof p.badges === 'string' ? p.badges : JSON.stringify(p.badges),
            p.summary, p.challenge, p.architecture_narrative,
            typeof p.architecture_steps === 'string' ? p.architecture_steps : JSON.stringify(p.architecture_steps),
            typeof p.technical_highlights === 'string' ? p.technical_highlights : JSON.stringify(p.technical_highlights),
            typeof p.verified_claims === 'string' ? p.verified_claims : JSON.stringify(p.verified_claims),
            typeof p.stack === 'string' ? p.stack : JSON.stringify(p.stack),
            typeof p.key_features === 'string' ? p.key_features : JSON.stringify(p.key_features || []),
            p.cover_image || null, p.is_published ? 1 : 0, p.created_at || Date.now(), p.updated_at || Date.now()
          );
        }
      }

      await db.exec('COMMIT;');
      await logActivity(user.id, 'RESTORE_BACKUP', 'backup', null, `Restored full portfolio data backup from ${data.exported_by || 'archive'}`);

      return new Response(JSON.stringify({ success: true, message: 'Backup successfully restored!' }), { status: 200 });
    } catch (txErr: any) {
      await db.exec('ROLLBACK;');
      throw txErr;
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Restore failed' }), { status: 500 });
  }
};
