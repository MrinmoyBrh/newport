import { getDb } from './db';
import { projects } from '../data/projects';
import { skillCategories } from '../data/skills';
import { timeline } from '../data/experience';
import { principles } from '../data/principles';

export async function runInitialSeed() {
  const db = getDb();

  // Check if already seeded (prevent overwriting existing data)
  const checkHero = (await db.prepare('SELECT COUNT(*) as count FROM hero_content').get()) as { count: any } | null;
  if (checkHero && Number(checkHero.count) > 0) {
    return; // Already initialized
  }

  // 1. Seed Hero Content
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
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?
    )
  `);

  const heroDesc = 'I focus on building reliable backend applications, designing APIs, and working with databases and cloud technologies. My experience includes developing web applications with Laravel, PHP, Python, and MySQL, along with exploring Linux, AWS, and backend system architecture. I enjoy solving practical engineering problems, understanding how systems work behind the scenes, and writing clean, maintainable code.';
  const heroDescHtml = 'I focus on building reliable backend applications, designing APIs, and working with databases and cloud technologies. My experience includes developing web applications with <strong class="text-pearl font-medium">Laravel, PHP, Python, and MySQL</strong>, along with exploring <strong class="text-pearl font-medium">Linux, AWS</strong>, and backend system architecture. I enjoy solving practical engineering problems, understanding how systems work behind the scenes, and writing clean, maintainable code.';

  await insertHero.run(
    'hero_default',
    'Mrinmoy Borah',
    'BACKEND SOFTWARE ENGINEER',
    'B.TECH CSE (2023 — 2027)',
    'DHEMAJI ENG. COLLEGE',
    'Architecting',
    'fault-tolerant',
    'backends.',
    heroDesc,
    heroDescHtml,
    'Explore Verified Systems',
    '#systems',
    'Interactive Architecture',
    '#architecture',
    'launch --terminal',
    '#terminal',
    'SYS.ORBIT // 26.14°N',
    'REDIS.V6.CLUSTER',
    'FAILOVER // 3.3-70B ➔ 1.5-FLASH',
    'LATENCY // <5ms HIT',
    'TOPOLOGY: DISTRIBUTED',
    'RELIABILITY: 99.9%',
    'FASTIFY GATEWAY',
    1,
    Date.now()
  );

  // 2. Seed Projects
  const insertProject = db.prepare(`
    INSERT INTO projects (
      id, slug, title, tagline, category, role, organization, period,
      placement, featured, display_order, github_url, live_url,
      badges, summary, challenge, architecture_narrative,
      architecture_steps, technical_highlights, verified_claims, stack, key_features,
      cover_image, is_published, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  for (let idx = 0; idx < projects.length; idx++) {
    const p = projects[idx];
    let placement = 'showcase';
    if (!p.featured) {
      placement = 'additional';
    }

    await insertProject.run(
      p.id,
      p.slug,
      p.title,
      p.tagline,
      p.category,
      p.role,
      p.organization || null,
      p.period,
      placement,
      p.featured ? 1 : 0,
      idx,
      p.githubUrl || null,
      p.liveUrl || null,
      JSON.stringify(p.badges),
      p.summary,
      p.challenge,
      p.architectureNarrative,
      JSON.stringify(p.architectureSteps),
      JSON.stringify(p.technicalHighlights),
      JSON.stringify(p.verifiedClaims),
      JSON.stringify(p.stack),
      JSON.stringify(p.keyFeatures || []),
      null,
      1,
      Date.now(),
      Date.now()
    );
  }

  // 3. Seed Skills & Categories
  const insertCategory = db.prepare(`
    INSERT INTO skill_categories (id, title, description, display_order, is_visible)
    VALUES (?, ?, ?, ?, 1)
  `);

  const insertSkill = db.prepare(`
    INSERT INTO skills (id, category_id, name, description, proficiency, is_highlighted, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (let cIdx = 0; cIdx < skillCategories.length; cIdx++) {
    const cat = skillCategories[cIdx];
    await insertCategory.run(cat.id, cat.title, cat.tagline, cIdx);
    for (let sIdx = 0; sIdx < cat.skills.length; sIdx++) {
      const s = cat.skills[sIdx];
      let prof = 'Practiced';
      if (s.name.includes('Laravel') || s.name.includes('Python') || s.name.includes('MySQL')) prof = 'Advanced';
      else if (s.name.includes('Fundamentals') || s.name.includes('Basic')) prof = 'Basic';
      else if (s.name.includes('AWS') || s.name.includes('Docker')) prof = 'Familiar';

      await insertSkill.run(
        `${cat.id}_${sIdx}`,
        cat.id,
        s.name,
        s.context || null,
        prof,
        s.highlight ? 1 : 0,
        sIdx
      );
    }
  }

  // 4. Seed Experiences & Education
  const insertExperience = db.prepare(`
    INSERT INTO experiences (
      id, role, company, location, period, type, status,
      description, responsibilities, technologies, display_order, is_published, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const insertEducation = db.prepare(`
    INSERT INTO education (
      id, degree, field, institution, location, period, status,
      details, display_order, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let idx = 0; idx < timeline.length; idx++) {
    const item = timeline[idx];
    if (item.type === 'Education') {
      await insertEducation.run(
        `edu_${idx}`,
        item.role,
        'Computer Science and Engineering',
        item.organization,
        item.location,
        item.period,
        'In Progress',
        JSON.stringify(item.points),
        idx,
        Date.now()
      );
    } else {
      await insertExperience.run(
        `exp_${idx}`,
        item.role,
        item.organization,
        item.location,
        item.period,
        item.type,
        'Completed',
        item.description,
        JSON.stringify(item.points),
        JSON.stringify(item.techStack),
        idx,
        Date.now()
      );
    }
  }

  // 5. Seed Engineering Principles
  const insertPrinciple = db.prepare(`
    INSERT INTO principles (
      id, number, title, summary, narrative, implementation, display_order, is_published
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  for (let idx = 0; idx < principles.length; idx++) {
    const p = principles[idx];
    await insertPrinciple.run(
      `prin_${p.number}`,
      p.number,
      p.title,
      p.subtitle,
      p.description,
      p.codeAccent,
      idx
    );
  }

  // 6. Seed Navigation Items
  const insertNav = db.prepare(`
    INSERT INTO navigation_items (id, label, url, display_order, is_visible, is_cta)
    VALUES (?, ?, ?, ?, 1, ?)
  `);

  const navItems = [
    { id: 'nav_systems', label: 'Systems', url: '#systems', cta: 0 },
    { id: 'nav_arch', label: 'Architecture', url: '#architecture', cta: 0 },
    { id: 'nav_principles', label: 'Principles', url: '#principles', cta: 0 },
    { id: 'nav_skills', label: 'Skills', url: '#skills', cta: 0 },
    { id: 'nav_exp', label: 'Experience', url: '#experience', cta: 0 },
    { id: 'nav_terminal', label: 'Terminal', url: '#terminal', cta: 0 },
    { id: 'nav_contact', label: 'Contact', url: '#contact', cta: 1 },
  ];

  for (let idx = 0; idx < navItems.length; idx++) {
    const n = navItems[idx];
    await insertNav.run(n.id, n.label, n.url, idx, n.cta);
  }

  // 7. Seed Interactive Modules (Simulation, Terminal, Contact, Footer)
  const insertModule = db.prepare(`
    INSERT INTO module_configs (id, module_key, data, updated_at)
    VALUES (?, ?, ?, ?)
  `);

  await insertModule.run(
    'mod_simulation',
    'simulation',
    JSON.stringify({
      title: 'SIMULATION HARNESS // LIVE ORCHESTRATION',
      subtitle: 'INTERACTIVE RUNNER TELEMETRY',
      description: 'Interactive execution harness demonstrating Docker container lifecycle, task queue buffering, and exit code verification.',
      defaultTimeout: 5000,
      memoryCap: '128MB',
      cpuCeiling: '0.5 Cores'
    }),
    Date.now()
  );

  await insertModule.run(
    'mod_terminal',
    'terminal',
    JSON.stringify({
      title: 'INTERACTIVE TERMINAL // CLIENT INGRESS',
      promptPrefix: 'mrinmoy>',
      welcomeMessage: 'MB-TERM v1.0.4 - Connected to live portfolio node worker-01.production\nType "help" to inspect verified architectural coordinates.',
      contactEmail: 'mrinmoyborah360@gmail.com',
      githubUrl: 'https://github.com/MrinmoyBrh',
      linkedinUrl: 'https://www.linkedin.com/in/mrinmoy-borah-7771843b9/'
    }),
    Date.now()
  );

  await insertModule.run(
    'mod_contact',
    'contact',
    JSON.stringify({
      heading: 'Coordinates.',
      subheading: 'Initiate Secure Transmission',
      tagline: 'Always open to discussing resilient backend architectures, API engineering, databases, and practical distributed computing problems.',
      email: 'mrinmoyborah360@gmail.com',
      githubUrl: 'https://github.com/MrinmoyBrh',
      linkedinUrl: 'https://www.linkedin.com/in/mrinmoy-borah-7771843b9/',
      location: 'Assam, India',
      status: 'Open to Software Engineering Opportunities'
    }),
    Date.now()
  );

  await insertModule.run(
    'mod_footer',
    'footer',
    JSON.stringify({
      copyrightText: 'Mrinmoy Borah. Engineered with architectural precision.',
      locationText: 'ASSAM, INDIA // UTC+5:30',
      availabilityText: 'SYSTEM NOMINAL — READY FOR DEPLOYMENT'
    }),
    Date.now()
  );

  // 8. Seed Appearance Settings
  const insertAppearance = db.prepare(`
    INSERT INTO appearance_settings (id, data, is_published, updated_at)
    VALUES (?, ?, 1, ?)
  `);

  await insertAppearance.run(
    'app_default',
    JSON.stringify({
      deepEspresso: '#1D1511',
      espresso: '#2B1D16',
      warmBrown: '#403027',
      oat: '#E9DFCF',
      mutedOat: '#C9BFAF',
      sageGreen: '#9CAF88',
      cloudAnimation: {
        enabled: true,
        opacity: 0.16,
        blurPx: 120,
        speedMultiplier: 0.8,
        cloud1Color: '#9CAF88',
        cloud2Color: '#403027',
        cloud3Color: '#2B1D16'
      }
    }),
    Date.now()
  );

  // 9. Seed SEO Settings
  const insertSeo = db.prepare(`
    INSERT INTO seo_settings (
      id, site_title, site_description, canonical_url,
      og_title, og_description, og_image, twitter_card, robots_directives, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await insertSeo.run(
    'seo_default',
    'Mrinmoy Borah | Backend Software Engineer — Distributed Systems & Resilient Architectures',
    'Personal portfolio of Mrinmoy Borah, Backend Software Engineer and B.Tech CSE student at Dhemaji Engineering College (2027). Specializing in BullMQ queues, Redis state machines, deterministic caching, and fault-tolerant gateways.',
    'https://mrinmoybrh.github.io',
    'Mrinmoy Borah | Backend Software Engineer',
    'Production portfolio featuring verified backend systems, Docker sandboxed execution, and resilient APIs.',
    null,
    'summary_large_image',
    'index, follow',
    Date.now()
  );

  // 10. Initial Activity Log
  const insertLog = db.prepare(`
    INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  await insertLog.run(
    'log_init',
    'system',
    'INITIALIZE',
    'system',
    'portfolio',
    'Database initialized and seeded from existing verified portfolio assets',
    Date.now()
  );
}
