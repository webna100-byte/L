/* Test helpers: an in-memory stand-in for the services the Cloudflare
   functions talk to, so the API handlers can run in plain Node.
   - FakeKV      the STORE binding (get/put/delete with json mode)
   - startFakeFirestore()  a small Firestore REST server (get, batchGet,
     transactions, commit with masks/increments/preconditions, runQuery)
   - makeEnv()   an env wired to both, with a throw-away signing key
   - idToken()   what the browser would hold after signing in with a custom
     token (unsigned: accepted because FIREBASE_AUTH_EMULATOR_HOST is set) */
import http from 'node:http';
import crypto from 'node:crypto';
import { encodeFields, decodeFields } from '../functions/_lib/firestore.js';

export class FakeKV {
  constructor() { this.m = new Map(); this.meta = new Map(); }
  async get(k, type) { const v = this.m.get(k); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; }
  async getWithMetadata(k) { const v = this.m.get(k); if (v === undefined) return { value: null, metadata: null }; const buf = typeof v === 'string' ? new TextEncoder().encode(v) : v; return { value: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), metadata: this.meta.get(k) || null }; }
  async put(k, v, opts) { this.m.set(k, typeof v === 'string' ? v : new Uint8Array(v)); if (opts && opts.metadata) this.meta.set(k, opts.metadata); }
  async delete(k) { this.m.delete(k); this.meta.delete(k); }
}

const B = 'projects/demo/databases/(default)/documents';

export async function startFakeFirestore() {
  const docs = new Map();            // full name -> plain object
  const log = [];
  const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  const fieldGet = (obj, path) => obj[path.replace(/`/g, '')];
  function matches(data, f) {
    if (!f) return true;
    if (f.compositeFilter) return f.compositeFilter.filters.every(x => matches(data, x));
    const ff = f.fieldFilter;
    const want = decodeFields({ v: ff.value }).v;
    const have = fieldGet(data, ff.field.fieldPath);
    if (ff.op === 'EQUAL') return have === want;
    if (have === undefined || have === null) return false;
    if (ff.op === 'GREATER_THAN_OR_EQUAL') return have >= want;
    if (ff.op === 'GREATER_THAN') return have > want;
    if (ff.op === 'LESS_THAN_OR_EQUAL') return have <= want;
    if (ff.op === 'LESS_THAN') return have < want;
    throw new Error('unsupported op ' + ff.op);
  }
  function applyWrite(w) {
    if (w.delete) { docs.delete(w.delete); return; }
    const name = w.update.name;
    const exists = docs.has(name);
    if (w.currentDocument && w.currentDocument.exists === false && exists) { const e = new Error('ALREADY_EXISTS'); e.code = 409; throw e; }
    if (w.currentDocument && w.currentDocument.exists === true && !exists) { const e = new Error('NOT_FOUND'); e.code = 404; throw e; }
    const incoming = decodeFields(w.update.fields || {});
    let next;
    if (w.updateMask) {
      next = { ...(docs.get(name) || {}) };
      for (const p of w.updateMask.fieldPaths) { const k = p.replace(/`/g, ''); if (k in incoming) next[k] = incoming[k]; }
    } else next = incoming;
    for (const t of w.updateTransforms || []) {
      const inc = decodeFields({ v: t.increment }).v;
      next[t.fieldPath] = (Number(next[t.fieldPath]) || 0) + inc;
    }
    docs.set(name, next);
  }
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString();
    const body = raw ? JSON.parse(raw) : {};
    const url = decodeURIComponent(req.url);
    log.push(req.method + ' ' + url);
    try {
      if (req.method === 'GET') {
        const name = url.replace(/^\/v1\//, '');
        return docs.has(name) ? send(res, 200, { name, fields: encodeFields(docs.get(name)) }) : send(res, 404, { error: 'not found' });
      }
      if (url.endsWith(':batchGet')) return send(res, 200, body.documents.map(n => docs.has(n) ? { found: { name: n, fields: encodeFields(docs.get(n)) } } : { missing: n }));
      if (url.endsWith(':beginTransaction')) return send(res, 200, { transaction: 'tx' + Math.random().toString(36).slice(2) });
      if (url.endsWith(':rollback')) return send(res, 200, {});
      if (url.endsWith(':commit')) {
        const snapshot = new Map(docs);
        try { body.writes.forEach(applyWrite); } catch (e) { docs.clear(); snapshot.forEach((v, k) => docs.set(k, v)); return send(res, e.code === 409 ? 409 : 400, { error: e.message }); }
        return send(res, 200, { writeResults: [] });
      }
      if (url.endsWith(':runQuery')) {
        const parent = url.replace(/^\/v1\//, '').replace(/:runQuery$/, '');
        const q = body.structuredQuery;
        const coll = q.from[0].collectionId;
        const out = [];
        for (const [name, data] of docs) {
          if (name.startsWith(parent + '/' + coll + '/') && !name.slice((parent + '/' + coll + '/').length).includes('/') && matches(data, q.where)) out.push({ document: { name, fields: encodeFields(data) } });
        }
        return send(res, 200, out.slice(0, q.limit || 1000));
      }
      send(res, 400, { error: 'unsupported ' + url });
    } catch (e) { send(res, 500, { error: e.message }); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const key = (path, site = '') => `${B}${site ? '/sites/' + site : ''}/${path}`;
  return {
    host: `127.0.0.1:${port}`,
    docs, log,
    get: (path, site) => docs.get(key(path, site)),
    set: (path, data, site) => docs.set(key(path, site), data),
    list: (collection, site) => [...docs].filter(([n]) => n.startsWith(key(collection, site) + '/')).map(([, d]) => d),
    close: () => new Promise(r => server.close(r))
  };
}

export function makeEnv(fsHost, extra = {}) {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    STORE: new FakeKV(),
    FIREBASE_PROJECT_ID: 'demo',
    FIREBASE_CLIENT_EMAIL: 'svc@demo.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).replace(/\n/g, '\\n'),
    FIRESTORE_EMULATOR_HOST: fsHost,
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9',
    ADMIN_PASSWORD: 'test-admin-password',
    OTP_PROVIDER: 'console',
    OTP_DEV_ECHO: '1',
    ...extra
  };
}

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
/* A Firebase custom token (what our API returns) -> the ID token the browser
   would hold after signInWithCustomToken. */
export function idTokenFromCustom(customToken) {
  const p = JSON.parse(Buffer.from(customToken.split('.')[1], 'base64url').toString());
  const now = Math.floor(Date.now() / 1000);
  return [b64({ alg: 'none' }), b64({ aud: 'demo', iss: 'https://securetoken.google.com/demo', sub: p.uid, iat: now, exp: now + 3600, firebase: { sign_in_provider: 'custom' }, ...p.claims }), 'x'].join('.');
}
export function staffToken(claims) {
  const now = Math.floor(Date.now() / 1000);
  return [b64({ alg: 'none' }), b64({ aud: 'demo', iss: 'https://securetoken.google.com/demo', sub: 'staff', iat: now, exp: now + 3600, ...claims }), 'x'].join('.');
}
export function googleToken(uid, site = '') {
  const now = Math.floor(Date.now() / 1000);
  return [b64({ alg: 'none' }), b64({ aud: 'demo', iss: 'https://securetoken.google.com/demo', sub: uid, iat: now, exp: now + 3600, email: uid + '@x.com', firebase: { sign_in_provider: 'google.com' } }), 'x'].join('.');
}

export function req(path, { method = 'GET', body, token, site } = {}) {
  return new Request('https://test.local' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(site ? { Cookie: 'rs_site=' + site } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}
export async function call(handler, ctx, request) {
  const res = await handler({ request, env: ctx.env, waitUntil: p => ctx.pending.push(p) });
  let json = {}; try { json = await res.json(); } catch (e) { /* empty */ }
  return { ...json, status: res.status };
}
