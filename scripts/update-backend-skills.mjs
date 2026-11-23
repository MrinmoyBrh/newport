import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const db = new DatabaseSync('data/portfolio.db');

// Ensure description column exists
const cols = (db.prepare('PRAGMA table_info(skills)').all()).map((c) => c.name);
if (!cols.includes('description')) {
  db.exec('ALTER TABLE skills ADD COLUMN description TEXT;');
  console.log('Added description column to skills table.');
}

const newSkills = [
  {
    id: 'backend-web_0',
    category_id: 'backend-web',
    name: 'Node.js & TypeScript',
    description: 'Building server-side applications, handling asynchronous operations, and organizing backend logic using TypeScript.',
    proficiency: 'Practiced',
    is_highlighted: 1,
    display_order: 0,
  },
  {
    id: 'backend-web_1',
    category_id: 'backend-web',
    name: 'Fastify & Express.js',
    description: 'Developing REST APIs with structured routing, middleware, request handling, and error management.',
    proficiency: 'Practiced',
    is_highlighted: 1,
    display_order: 1,
  },
  {
    id: 'backend-web_2',
    category_id: 'backend-web',
    name: 'REST API Development',
    description: 'Working with HTTP methods, JSON payloads, request validation, API endpoints, and client-server communication.',
    proficiency: 'Practiced',
    is_highlighted: 1,
    display_order: 2,
  },
  {
    id: 'backend-web_3',
    category_id: 'backend-web',
    name: 'PostgreSQL & MySQL',
    description: 'Writing SQL queries, designing relational tables, managing database relationships, and integrating databases with backend applications.',
    proficiency: 'Practiced',
    is_highlighted: 1,
    display_order: 3,
  },
  {
    id: 'backend-web_4',
    category_id: 'backend-web',
    name: 'Docker & Containerization',
    description: 'Running applications and code evaluation tasks in isolated containers with resource limits and controlled execution.',
    proficiency: 'Practiced',
    is_highlighted: 1,
    display_order: 4,
  },
  {
    id: 'backend-web_5',
    category_id: 'backend-web',
    name: 'Authentication & Security',
    description: 'Implementing login workflows, session management, protected routes, access control, and secure authentication features.',
    proficiency: 'Practiced',
    is_highlighted: 1,
    display_order: 5,
  },
  {
    id: 'backend-web_6',
    category_id: 'backend-web',
    name: 'Git & GitHub Integration',
    description: 'Managing repositories, branches, pull requests, and GitHub-based development workflows.',
    proficiency: 'Practiced',
    is_highlighted: 0,
    display_order: 6,
  },
  {
    id: 'backend-web_7',
    category_id: 'backend-web',
    name: 'Python & Backend Automation',
    description: 'Writing Python scripts for automation, file handling, data processing, and backend utilities.',
    proficiency: 'Practiced',
    is_highlighted: 0,
    display_order: 7,
  },
  {
    id: 'backend-web_8',
    category_id: 'backend-web',
    name: 'Laravel & PHP',
    description: 'Developing MVC-based web applications, administrative workflows, database-backed features, and server-side business logic.',
    proficiency: 'Practiced',
    is_highlighted: 0,
    display_order: 8,
  },
  {
    id: 'backend-web_9',
    category_id: 'backend-web',
    name: 'Admin Dashboards & Email Notifications',
    description: 'Building administrative interfaces, content management workflows, email verification, and automated notification features.',
    proficiency: 'Practiced',
    is_highlighted: 0,
    display_order: 9,
  },
];

// Delete previous backend-web skills
db.prepare('DELETE FROM skills WHERE category_id = ?').run('backend-web');

// Insert new skills
const insert = db.prepare('INSERT INTO skills (id, category_id, name, description, proficiency, is_highlighted, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
for (const s of newSkills) {
  insert.run(s.id, s.category_id, s.name, s.description, s.proficiency, s.is_highlighted, s.display_order);
}

// Log activity
const adminUser = db.prepare('SELECT id FROM admin_users LIMIT 1').get();
if (adminUser) {
  db.prepare('INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), adminUser.id, 'UPDATE', 'skills', 'backend-web', 'Updated Backend & Web Development skills matrix to modernized backend focus', Date.now());
}

console.log('Successfully updated backend-web skills in SQLite database.');
const rows = db.prepare('SELECT id, name, description, proficiency, is_highlighted, display_order FROM skills WHERE category_id = ? ORDER BY display_order ASC').all('backend-web');
console.log('Verification count:', rows.length);
for (const r of rows) {
  console.log(`[#${r.display_order + 1}] ${r.name} - ${r.description} (${r.proficiency}, highlight: ${r.is_highlighted})`);
}
