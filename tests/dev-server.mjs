/* Local stand-in for Cloudflare Pages: serves /public, runs the real
   functions/api handlers, and uses the in-memory KV/Firestore from
   fake-backend.mjs. Used by the browser tests (the Firebase JS SDK is
   replaced by the stubs below because the real one needs a real project).

   const dev = await startDevServer({ config }); ... dev.url ... await dev.close() */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFakeFirestore, makeEnv } from './fake-backend.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };

globalThis.caches = globalThis.caches || { default: { match: async () => undefined, put: async () => {}, delete: async () => {} } };

async function handler(file, method, ctx) {
  const mod = await import(path.join(root, file) + '?v=' + Date.now());
  const fn = mod['onRequest' + method[0] + method.slice(1).toLowerCase()] || mod.onRequest;
  return fn ? fn(ctx) : new Response('method not allowed', { status: 405 });
}

export async function startDevServer({ config, env: extraEnv = {} } = {}) {
  const store = await startFakeFirestore();
  const env = makeEnv(store.host, { FIREBASE_API_KEY: 'fake', FIREBASE_APP_ID: 'fake', FIREBASE_MESSAGING_SENDER_ID: '1', ...extraEnv });
  if (config) await env.STORE.put('config', JSON.stringify(config));
  const pending = [];
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      if (url.pathname.startsWith('/api/')) {
        const rel = 'functions' + url.pathname + '.js';
        const file = fs.existsSync(path.join(root, rel)) ? rel : null;
        if (!file) { res.writeHead(404); return res.end('{"error":"not_found"}'); }
        const request = new Request('http://localhost' + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
        const out = await handler(file, req.method, { request, env, params: {}, waitUntil: p => pending.push(p) });
        res.writeHead(out.status, Object.fromEntries(out.headers));
        return res.end(Buffer.from(await out.arrayBuffer()));
      }
      if (url.pathname.startsWith('/img/')) {
        const request = new Request('http://localhost' + req.url);
        const out = await handler('functions/img/[id].js', 'GET', { request, env, params: { id: url.pathname.slice(5) }, waitUntil: p => pending.push(p) });
        res.writeHead(out.status, Object.fromEntries(out.headers));
        return res.end(Buffer.from(await out.arrayBuffer()));
      }
      let p = decodeURIComponent(url.pathname);
      const cands = [p, p + '.html', path.join(p, 'index.html')];
      const hit = cands.map(c => path.join(root, 'public', c)).find(f => f.startsWith(path.join(root, 'public')) && fs.existsSync(f) && fs.statSync(f).isFile());
      if (!hit) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(hit)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(hit));
    } catch (e) { console.error(e); res.writeHead(500); res.end(String(e && e.stack || e)); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    env, store,
    close: async () => { await new Promise(r => server.close(r)); await store.close(); }
  };
}

/* Replacements for the Firebase JS SDK modules loaded from gstatic. The auth
   stub signs in with the custom token our API issues and hands the server an
   unsigned ID token that the test environment accepts. */
export const FIREBASE_STUBS = {
  app: `const apps = [];
export function getApps() { return apps; }
export function initializeApp(cfg, name) { const a = { name: name || '[DEFAULT]' }; apps.push(a); return a; }`,
  auth: `const states = {};
const b64 = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, '').replace(/\\+/g, '-').replace(/\\//g, '_');
const dec = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
function mk(u) { return { uid: u.uid, displayName: '', email: '', getIdToken: async () => u.idToken, getIdTokenResult: async () => ({ claims: u.claims }) }; }
export function getAuth(app) { return states[app.name] || (states[app.name] = { app, user: null, listeners: [] }); }
export function onAuthStateChanged(auth, cb) {
  auth.listeners.push(cb);
  try { const s = localStorage.getItem('stub_user_' + auth.app.name); if (s) auth.user = mk(JSON.parse(s)); } catch (e) {}
  setTimeout(() => cb(auth.user), 0);
  return () => {};
}
export async function signInWithCustomToken(auth, token) {
  const p = dec(token.split('.')[1]); const now = Math.floor(Date.now() / 1000);
  const claims = p.claims || {};
  const idToken = [b64({ alg: 'none' }), b64({ aud: 'demo', iss: 'https://securetoken.google.com/demo', sub: p.uid, iat: now, exp: now + 3600, firebase: { sign_in_provider: 'custom' }, ...claims }), 'x'].join('.');
  const u = { uid: p.uid, idToken, claims };
  try { localStorage.setItem('stub_user_' + auth.app.name, JSON.stringify(u)); } catch (e) {}
  auth.user = mk(u); auth.listeners.forEach(cb => cb(auth.user));
  return { user: auth.user };
}
export async function signOut(auth) { auth.user = null; try { localStorage.removeItem('stub_user_' + auth.app.name); } catch (e) {} auth.listeners.forEach(cb => cb(null)); }
export function connectAuthEmulator() {}
export async function getRedirectResult() { return null; }
export class GoogleAuthProvider { setCustomParameters() {} }
export async function signInWithPopup() { return null; }
export async function signInWithRedirect() { return null; }`,
  firestore: `export function getFirestore() { return {}; }
export function connectFirestoreEmulator() {}
export const collection = () => ({}), query = () => ({}), where = () => ({}), orderBy = () => ({}), limit = () => ({}), doc = () => ({});
export function onSnapshot(q, cb) { setTimeout(() => cb({ docs: [], docChanges: () => [], empty: true }), 0); return () => {}; }
export async function getDocs() { return { docs: [], empty: true }; }`
};
