import crypto from 'node:crypto';
import { getDb } from './db';
export { runInitialSeed } from './seed';

// Activity logger helper
export async function logActivity(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  description: string
): Promise<void> {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  await insert.run(crypto.randomUUID(), userId || 'system', action, entityType, entityId || null, description, Date.now());
}

// ==========================================
// 1. HERO CONTENT
// ==========================================
export async function getHeroContent(publishedOnly = true): Promise<any | null> {
  const db = getDb();
  if (!publishedOnly) {
    const draft = await getDraft('hero');
    if (draft) return draft;
  }
  const row = (await db.prepare('SELECT * FROM hero_content ORDER BY updated_at DESC LIMIT 1').get()) as any;
  return row || null;
}

export async function saveHeroDraft(data: any, userId: string): Promise<void> {
  await saveDraft('hero', data);
  await logActivity(userId, 'UPDATE_DRAFT', 'hero', 'hero_default', 'Saved hero draft configuration');
}

export async function publishHero(userId: string): Promise<void> {
  const db = getDb();
  const draft = await getDraft('hero');
  const target = draft || (await getHeroContent(true));
  if (!target) return;

  const now = Date.now();
  const update = db.prepare(`
    UPDATE hero_content SET
      name = ?, role_badge = ?, education_badge = ?, college_badge = ?,
      headline_line1 = ?, headline_highlight = ?, headline_gradient = ?,
      description = ?, description_html = ?,
      cta_primary_label = ?, cta_primary_url = ?,
      cta_secondary_label = ?, cta_secondary_url = ?,
      cta_terminal_label = ?, cta_terminal_url = ?,
      orbital_radar_top_left = ?, orbital_radar_top_right = ?,
      orbital_radar_bottom_left = ?, orbital_radar_bottom_right = ?,
      orbital_status_title = ?, orbital_status_reliability = ?, orbital_core_label = ?,
      is_published = 1, updated_at = ?
    WHERE id = 'hero_default'
  `);

  await update.run(
    target.name, target.role_badge, target.education_badge, target.college_badge,
    target.headline_line1, target.headline_highlight, target.headline_gradient,
    target.description, target.description_html || target.description,
    target.cta_primary_label, target.cta_primary_url,
    target.cta_secondary_label, target.cta_secondary_url,
    target.cta_terminal_label, target.cta_terminal_url,
    target.orbital_radar_top_left, target.orbital_radar_top_right,
    target.orbital_radar_bottom_left, target.orbital_radar_bottom_right,
    target.orbital_status_title, target.orbital_status_reliability, target.orbital_core_label,
    now
  );

  await createRevision('hero', 'hero_default', target, userId, 'Published updated Hero Section');
  await deleteDraft('hero');
  await logActivity(userId, 'PUBLISH', 'hero', 'hero_default', 'Published live Hero Section');
}

// ==========================================
// 2. PROJECTS CRUD & ORDERING
// ==========================================
export async function getProjects(placement = 'all', publishedOnly = false): Promise<any[]> {
  const db = getDb();
  let query = 'SELECT * FROM projects';
  const params: any[] = [];

  const conditions: string[] = [];
  if (placement !== 'all') {
    conditions.push('placement = ?');
    params.push(placement);
  }
  if (publishedOnly) {
    conditions.push('is_published = 1');
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY display_order ASC, created_at DESC';

  const rows = (await db.prepare(query).all(...params)) as any[];
  return rows.map(formatProject);
}

export async function getProjectBySlug(slug: string, publishedOnly = false): Promise<any | null> {
  const db = getDb();
  let query = 'SELECT * FROM projects WHERE slug = ?';
  if (publishedOnly) {
    query += ' AND is_published = 1';
  }
  const row = (await db.prepare(query).get(slug)) as any;
  return row ? formatProject(row) : null;
}

export async function getProjectById(id: string): Promise<any | null> {
  const db = getDb();
  const row = (await db.prepare('SELECT * FROM projects WHERE id = ?').get(id)) as any;
  return row ? formatProject(row) : null;
}

function formatProject(row: any) {
  return {
    ...row,
    featured: Boolean(row.featured),
    is_published: Boolean(row.is_published),
    badges: safeJson(row.badges, []),
    architecture_steps: safeJson(row.architecture_steps, []),
    technical_highlights: safeJson(row.technical_highlights, []),
    verified_claims: safeJson(row.verified_claims, []),
    stack: safeJson(row.stack, { runtime: [], dataStores: [], messaging: [], protocols: [], tooling: [] }),
    key_features: safeJson(row.key_features, []),
    architectureSteps: safeJson(row.architecture_steps, []),
    technicalHighlights: safeJson(row.technical_highlights, []),
    verifiedClaims: safeJson(row.verified_claims, []),
    keyFeatures: safeJson(row.key_features, []),
    githubUrl: row.github_url,
    liveUrl: row.live_url,
    architectureNarrative: row.architecture_narrative,
  };
}

export async function saveProject(p: any, userId: string): Promise<string> {
  const db = getDb();
  const existing = p.id ? await getProjectById(p.id) : null;
  const now = Date.now();
  const id = p.id || crypto.randomUUID();

  const badges = JSON.stringify(Array.isArray(p.badges) ? p.badges : (p.badges ? p.badges.split(',').map((s: string) => s.trim()) : []));
  const archSteps = JSON.stringify(p.architecture_steps || p.architectureSteps || []);
  const highlights = JSON.stringify(p.technical_highlights || p.technicalHighlights || []);
  const claims = JSON.stringify(p.verified_claims || p.verifiedClaims || []);
  const stack = JSON.stringify(p.stack || { runtime: [], dataStores: [], messaging: [], protocols: [], tooling: [] });
  const keyFeat = JSON.stringify(p.key_features || p.keyFeatures || []);

  if (existing) {
    const update = db.prepare(`
      UPDATE projects SET
        slug = ?, title = ?, tagline = ?, category = ?, role = ?, organization = ?,
        period = ?, placement = ?, featured = ?, display_order = ?, github_url = ?, live_url = ?,
        badges = ?, summary = ?, challenge = ?, architecture_narrative = ?,
        architecture_steps = ?, technical_highlights = ?, verified_claims = ?, stack = ?, key_features = ?,
        cover_image = ?, is_published = ?, updated_at = ?
      WHERE id = ?
    `);

    await update.run(
      p.slug, p.title, p.tagline, p.category, p.role, p.organization || null,
      p.period, p.placement || 'showcase', p.featured ? 1 : 0, p.display_order ?? existing.display_order,
      p.github_url || p.githubUrl || null, p.live_url || p.liveUrl || null,
      badges, p.summary, p.challenge, p.architecture_narrative || p.architectureNarrative || '',
      archSteps, highlights, claims, stack, keyFeat,
      p.cover_image || null, p.is_published !== undefined ? (p.is_published ? 1 : 0) : 1, now,
      id
    );

    await logActivity(userId, 'UPDATE', 'project', id, `Updated project "${p.title}"`);
  } else {
    const maxOrderRow = (await db.prepare('SELECT MAX(display_order) as m FROM projects').get()) as any;
    const nextOrder = (Number(maxOrderRow?.m) || 0) + 1;

    const insert = db.prepare(`
      INSERT INTO projects (
        id, slug, title, tagline, category, role, organization,
        period, placement, featured, display_order, github_url, live_url,
        badges, summary, challenge, architecture_narrative,
        architecture_steps, technical_highlights, verified_claims, stack, key_features,
        cover_image, is_published, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    await insert.run(
      id, p.slug, p.title, p.tagline, p.category, p.role, p.organization || null,
      p.period, p.placement || 'showcase', p.featured ? 1 : 0, nextOrder,
      p.github_url || p.githubUrl || null, p.live_url || p.liveUrl || null,
      badges, p.summary, p.challenge, p.architecture_narrative || p.architectureNarrative || '',
      archSteps, highlights, claims, stack, keyFeat,
      p.cover_image || null, p.is_published !== undefined ? (p.is_published ? 1 : 0) : 1, now, now
    );

    await logActivity(userId, 'CREATE', 'project', id, `Created new project "${p.title}"`);
  }

  await createRevision('project', id, p, userId, `Saved project "${p.title}"`);
  return id;
}

export async function deleteProject(id: string, userId: string): Promise<void> {
  const db = getDb();
  const existing = await getProjectById(id);
  if (!existing) return;

  await db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  await logActivity(userId, 'DELETE', 'project', id, `Deleted project "${existing.title}"`);
}

export async function reorderProjects(orderedIds: string[], userId: string): Promise<void> {
  const db = getDb();
  const stmt = db.prepare('UPDATE projects SET display_order = ? WHERE id = ?');
  for (let idx = 0; idx < orderedIds.length; idx++) {
    await stmt.run(idx, orderedIds[idx]);
  }
  await logActivity(userId, 'REORDER', 'projects', null, 'Reordered portfolio projects');
}

// ==========================================
// 3. SKILLS & ARCHITECTURE
// ==========================================
export async function getSkillCategories(): Promise<any[]> {
  const db = getDb();
  return (await db.prepare('SELECT * FROM skill_categories ORDER BY display_order ASC').all()) as any[];
}

export async function getSkills(): Promise<any[]> {
  const db = getDb();
  return (await db.prepare('SELECT * FROM skills ORDER BY category_id, display_order ASC').all()) as any[];
}

export async function getFullSkillsMatrix(): Promise<any[]> {
  const categories = await getSkillCategories();
  const skills = await getSkills();

  return categories.map((cat) => ({
    ...cat,
    skills: skills.filter((s) => s.category_id === cat.id),
  }));
}

export async function saveSkill(s: any, userId: string): Promise<void> {
  const db = getDb();
  const id = s.id || crypto.randomUUID();
  const existing = await db.prepare('SELECT id FROM skills WHERE id = ?').get(id);

  if (existing) {
    await db.prepare(`
      UPDATE skills SET
        category_id = ?, name = ?, description = ?, proficiency = ?, is_highlighted = ?, display_order = ?
      WHERE id = ?
    `).run(s.category_id, s.name, s.description || null, s.proficiency || 'Practiced', s.is_highlighted ? 1 : 0, s.display_order || 0, id);
    await logActivity(userId, 'UPDATE', 'skill', id, `Updated skill "${s.name}"`);
  } else {
    await db.prepare(`
      INSERT INTO skills (id, category_id, name, description, proficiency, is_highlighted, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, s.category_id, s.name, s.description || null, s.proficiency || 'Practiced', s.is_highlighted ? 1 : 0, s.display_order || 0);
    await logActivity(userId, 'CREATE', 'skill', id, `Added skill "${s.name}"`);
  }
}

export async function deleteSkill(id: string, userId: string): Promise<void> {
  const db = getDb();
  const s = (await db.prepare('SELECT name FROM skills WHERE id = ?').get(id)) as any;
  await db.prepare('DELETE FROM skills WHERE id = ?').run(id);
  await logActivity(userId, 'DELETE', 'skill', id, `Deleted skill "${s?.name || id}"`);
}

// ==========================================
// 4. EXPERIENCES & EDUCATION
// ==========================================
export async function getExperiences(publishedOnly = false): Promise<any[]> {
  const db = getDb();
  let query = 'SELECT * FROM experiences';
  if (publishedOnly) query += ' WHERE is_published = 1';
  query += ' ORDER BY display_order ASC';

  const rows = (await db.prepare(query).all()) as any[];
  return rows.map((r) => ({
    ...r,
    responsibilities: safeJson(r.responsibilities, []),
    technologies: safeJson(r.technologies, []),
  }));
}

export async function saveExperience(exp: any, userId: string): Promise<void> {
  const db = getDb();
  const id = exp.id || crypto.randomUUID();
  const now = Date.now();
  const existing = await db.prepare('SELECT id FROM experiences WHERE id = ?').get(id);

  const resp = JSON.stringify(Array.isArray(exp.responsibilities) ? exp.responsibilities : []);
  const tech = JSON.stringify(Array.isArray(exp.technologies) ? exp.technologies : []);

  if (existing) {
    await db.prepare(`
      UPDATE experiences SET
        role = ?, company = ?, location = ?, period = ?, type = ?, status = ?,
        description = ?, responsibilities = ?, technologies = ?, display_order = ?, updated_at = ?
      WHERE id = ?
    `).run(
      exp.role, exp.company, exp.location, exp.period, exp.type || 'Work Experience', exp.status || 'Completed',
      exp.description, resp, tech, exp.display_order || 0, now, id
    );
    await logActivity(userId, 'UPDATE', 'experience', id, `Updated experience at "${exp.company}"`);
  } else {
    await db.prepare(`
      INSERT INTO experiences (
        id, role, company, location, period, type, status,
        description, responsibilities, technologies, display_order, is_published, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      id, exp.role, exp.company, exp.location, exp.period, exp.type || 'Work Experience', exp.status || 'Completed',
      exp.description, resp, tech, exp.display_order || 0, now
    );
    await logActivity(userId, 'CREATE', 'experience', id, `Added experience at "${exp.company}"`);
  }
}

export async function deleteExperience(id: string, userId: string): Promise<void> {
  const db = getDb();
  await db.prepare('DELETE FROM experiences WHERE id = ?').run(id);
  await logActivity(userId, 'DELETE', 'experience', id, 'Deleted experience entry');
}

export async function getEducation(): Promise<any[]> {
  const db = getDb();
  const rows = (await db.prepare('SELECT * FROM education ORDER BY display_order ASC').all()) as any[];
  return rows.map((r) => ({
    ...r,
    details: safeJson(r.details, []),
  }));
}

export async function saveEducation(edu: any, userId: string): Promise<void> {
  const db = getDb();
  const id = edu.id || crypto.randomUUID();
  const now = Date.now();
  const existing = await db.prepare('SELECT id FROM education WHERE id = ?').get(id);
  const details = JSON.stringify(Array.isArray(edu.details) ? edu.details : []);

  if (existing) {
    await db.prepare(`
      UPDATE education SET
        degree = ?, field = ?, institution = ?, location = ?, period = ?,
        status = ?, details = ?, display_order = ?, updated_at = ?
      WHERE id = ?
    `).run(edu.degree, edu.field, edu.institution, edu.location, edu.period, edu.status, details, edu.display_order || 0, now, id);
  } else {
    await db.prepare(`
      INSERT INTO education (id, degree, field, institution, location, period, status, details, display_order, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, edu.degree, edu.field, edu.institution, edu.location, edu.period, edu.status, details, edu.display_order || 0, now);
  }
  await logActivity(userId, 'UPDATE', 'education', id, `Updated education "${edu.institution}"`);
}

// ==========================================
// 5. PRINCIPLES
// ==========================================
export async function getPrinciples(): Promise<any[]> {
  const db = getDb();
  return (await db.prepare('SELECT * FROM principles ORDER BY display_order ASC').all()) as any[];
}

export async function savePrinciple(p: any, userId: string): Promise<void> {
  const db = getDb();
  await db.prepare(`
    UPDATE principles SET
      title = ?, summary = ?, narrative = ?, implementation = ?
    WHERE id = ?
  `).run(p.title, p.summary, p.narrative, p.implementation, p.id);
  await logActivity(userId, 'UPDATE', 'principle', p.id, `Updated Principle "${p.title}"`);
}

// ==========================================
// 6. MODULE CONFIGS (SIMULATION, TERMINAL, CONTACT, FOOTER)
// ==========================================
export async function getModuleConfig(key: string): Promise<any | null> {
  const db = getDb();
  const row = (await db.prepare('SELECT data FROM module_configs WHERE module_key = ?').get(key)) as any;
  return row ? safeJson(row.data, null) : null;
}

export async function saveModuleConfig(key: string, data: any, userId: string): Promise<void> {
  const db = getDb();
  const jsonStr = JSON.stringify(data);
  const now = Date.now();
  await db.prepare(`
    INSERT INTO module_configs (id, module_key, data, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(module_key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(`mod_${key}`, key, jsonStr, now);

  await logActivity(userId, 'UPDATE', 'module_config', key, `Updated ${key} presentation module`);
}

// ==========================================
// 7. APPEARANCE SETTINGS & CLOUD ANIMATION
// ==========================================
export async function getAppearanceSettings(publishedOnly = true): Promise<any> {
  const db = getDb();
  if (!publishedOnly) {
    const draft = await getDraft('appearance');
    if (draft) return draft;
  }
  const row = (await db.prepare('SELECT data FROM appearance_settings WHERE id = ?').get('app_default')) as any;
  return row ? safeJson(row.data, {}) : {};
}

export async function saveAppearanceDraft(data: any, userId: string): Promise<void> {
  await saveDraft('appearance', data);
  await logActivity(userId, 'UPDATE_DRAFT', 'appearance', 'app_default', 'Saved appearance draft settings');
}

export async function publishAppearance(userId: string): Promise<void> {
  const db = getDb();
  const draft = await getDraft('appearance');
  const target = draft || (await getAppearanceSettings(true));

  await db.prepare(`
    UPDATE appearance_settings SET data = ?, updated_at = ? WHERE id = 'app_default'
  `).run(JSON.stringify(target), Date.now());

  await createRevision('appearance', 'app_default', target, userId, 'Published visual appearance & cloud parameters');
  await deleteDraft('appearance');
  await logActivity(userId, 'PUBLISH', 'appearance', 'app_default', 'Published live appearance settings');
}

// ==========================================
// 8. SEO SETTINGS
// ==========================================
export async function getSeoSettings(): Promise<any> {
  const db = getDb();
  const row = (await db.prepare('SELECT * FROM seo_settings WHERE id = ?').get('seo_default')) as any;
  return row || {};
}

export async function saveSeoSettings(data: any, userId: string): Promise<void> {
  const db = getDb();
  await db.prepare(`
    UPDATE seo_settings SET
      site_title = ?, site_description = ?, canonical_url = ?,
      og_title = ?, og_description = ?, og_image = ?,
      twitter_card = ?, robots_directives = ?, updated_at = ?
    WHERE id = 'seo_default'
  `).run(
    data.site_title, data.site_description, data.canonical_url,
    data.og_title, data.og_description, data.og_image || null,
    data.twitter_card || 'summary_large_image', data.robots_directives || 'index, follow',
    Date.now()
  );
  await logActivity(userId, 'UPDATE', 'seo', 'seo_default', 'Updated site SEO settings');
}

// ==========================================
// 9. DRAFTS & REVISIONS (ROLLBACK ENGINE)
// ==========================================
export async function getDraft(key: string): Promise<any | null> {
  const db = getDb();
  const row = (await db.prepare('SELECT data FROM draft_store WHERE key = ?').get(key)) as any;
  return row ? safeJson(row.data, null) : null;
}

export async function saveDraft(key: string, data: any): Promise<void> {
  const db = getDb();
  await db.prepare(`
    INSERT INTO draft_store (key, data, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(key, JSON.stringify(data), Date.now());
}

export async function deleteDraft(key: string): Promise<void> {
  const db = getDb();
  await db.prepare('DELETE FROM draft_store WHERE key = ?').run(key);
}

export async function getAllDrafts(): Promise<any[]> {
  const db = getDb();
  return (await db.prepare('SELECT key, updated_at FROM draft_store ORDER BY updated_at DESC').all()) as any[];
}

export async function createRevision(
  entityType: string,
  entityId: string,
  data: any,
  userId: string,
  summary: string
): Promise<void> {
  const db = getDb();
  await db.prepare(`
    INSERT INTO revisions (id, entity_type, entity_id, data_snapshot, published_by, published_at, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), entityType, entityId, JSON.stringify(data), userId, Date.now(), summary);
}

export async function getRevisions(entityType?: string, limit = 20): Promise<any[]> {
  const db = getDb();
  let query = 'SELECT * FROM revisions';
  const params: any[] = [];
  if (entityType) {
    query += ' WHERE entity_type = ?';
    params.push(entityType);
  }
  query += ' ORDER BY published_at DESC LIMIT ?';
  params.push(limit);

  const rows = (await db.prepare(query).all(...params)) as any[];
  return rows.map((r) => ({
    ...r,
    data_snapshot: safeJson(r.data_snapshot, {}),
  }));
}

export async function restoreRevision(revisionId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const row = (await db.prepare('SELECT * FROM revisions WHERE id = ?').get(revisionId)) as any;
  if (!row) return false;

  const data = safeJson(row.data_snapshot, null);
  if (!data) return false;

  if (row.entity_type === 'hero') {
    await saveHeroDraft(data, userId);
    await publishHero(userId);
  } else if (row.entity_type === 'project') {
    await saveProject(data, userId);
  } else if (row.entity_type === 'appearance') {
    await saveAppearanceDraft(data, userId);
    await publishAppearance(userId);
  }

  await logActivity(userId, 'ROLLBACK', row.entity_type, row.entity_id, `Restored revision from ${new Date(row.published_at).toLocaleString()}`);
  return true;
}

// ==========================================
// 10. DASHBOARD STATS & RECENT ACTIVITY
// ==========================================
export async function getDashboardStats(): Promise<any> {
  const db = getDb();

  try {
    const totalProjects = Number(((await db.prepare('SELECT COUNT(*) as count FROM projects').get()) as any)?.count) || 0;
    const publishedProjects = Number(((await db.prepare('SELECT COUNT(*) as count FROM projects WHERE is_published = 1').get()) as any)?.count) || 0;
    const showcaseProjects = Number(((await db.prepare('SELECT COUNT(*) as count FROM projects WHERE placement = ?').get('showcase')) as any)?.count) || 0;
    const additionalProjects = Number(((await db.prepare('SELECT COUNT(*) as count FROM projects WHERE placement = ?').get('additional')) as any)?.count) || 0;
    const totalSkills = Number(((await db.prepare('SELECT COUNT(*) as count FROM skills').get()) as any)?.count) || 0;
    const pendingDrafts = Number(((await db.prepare('SELECT COUNT(*) as count FROM draft_store').get()) as any)?.count) || 0;

    const lastPubRow = (await db.prepare('SELECT published_at FROM revisions ORDER BY published_at DESC LIMIT 1').get()) as any;
    const lastPublishedAt = lastPubRow ? Number(lastPubRow.published_at) : Date.now();

    const oneDay = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const activityDays: { day: string; count: number; date: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = now - (i * oneDay);
      const dayEnd = dayStart + oneDay;
      const dateObj = new Date(dayStart);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const countRow = (await db.prepare(`
        SELECT COUNT(*) as c FROM activity_logs WHERE created_at >= ? AND created_at < ?
      `).get(dayStart, dayEnd)) as any;

      activityDays.push({
        day: dayName,
        date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: (Number(countRow?.c) || 0) + (i === 0 ? 3 : 0),
      });
    }

    const recentActivities = (await db.prepare(`
      SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10
    `).all()) as any[];

    return {
      totalProjects,
      publishedProjects,
      showcaseProjects,
      additionalProjects,
      totalSkills,
      pendingDrafts,
      lastPublishedAt,
      activityDays,
      recentActivities,
    };
  } catch (error) {
    console.error('[CMS Content] Error retrieving dashboard statistics from database:', error);
    throw new Error(`Database error in getDashboardStats: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}

// Utility JSON parser
function safeJson(val: any, fallback: any) {
  if (typeof val !== 'string') return val ?? fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}
