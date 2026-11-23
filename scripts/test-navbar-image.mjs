import { spawn } from 'node:child_process';
import http from 'node:http';

console.log('Testing navbar profile picture on production server...');

process.env.HOST = '127.0.0.1';
process.env.PORT = '4322';

const server = spawn('node', ['dist/server/entry.mjs'], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

try {
  await wait(3000);

  // 1. Verify image static asset serving
  const imgRes = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:4322/images/profile.jpg', (res) => {
      resolve({ status: res.statusCode, headers: res.headers });
    }).on('error', reject);
  });

  console.log(`[Image Check] Status: ${imgRes.status}, Content-Type: ${imgRes.headers['content-type']}, Content-Length: ${imgRes.headers['content-length']}`);
  if (imgRes.status !== 200) {
    throw new Error(`Static image failed with status ${imgRes.status}`);
  }

  // 2. Verify HTML rendered in navbar
  const htmlRes = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:4322/', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });

  const hasImgTag = htmlRes.includes('/images/profile.jpg');
  const hasFallbackMB = htmlRes.includes('>MB</span>');
  const hasOnError = htmlRes.includes('onerror="this.style.display=\'none\'"');

  console.log(`[HTML Check] Image src present: ${hasImgTag}`);
  console.log(`[HTML Check] Fallback MB initials present: ${hasFallbackMB}`);
  console.log(`[HTML Check] Fallback onerror handler present: ${hasOnError}`);

  if (hasImgTag && hasFallbackMB && hasOnError) {
    console.log('\n[PASS] Navbar profile image and MB fallback verified successfully on production build!');
  } else {
    throw new Error('Navbar image HTML verification failed');
  }
} finally {
  server.kill('SIGTERM');
}
