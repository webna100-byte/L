# Uptown Burger & Wings — standalone site (hand-off for a new chat)

Read this file first. It has everything needed to build Uptown as its OWN site on NEW accounts
(GitHub, Cloudflare, Firebase) owned by the restaurant's Gmail. Nothing here contains a secret.

## 1. What this is
- White-label restaurant ordering platform: Cloudflare Pages (static `public/` + Pages Functions in `functions/`),
  Cloudflare KV (binding `STORE`) for the site config/images, Firebase Auth + Firestore (REST, service account) + FCM.
- Client: Uptown Burger & Wings, Ramallah, Palestine. Branches: الإرسال (irsal) and الطيرة (tira). Arabic RTL, mobile-first, currency ILS, timezone Asia/Hebron.
- Products (real prices): كرسبي تشيكن 25, ستيك 36, هاواي 30, البصل المكرمل 30, نباتي 30. Wings 28, fries 12, drink 7 are PLACEHOLDERS. Photos are placeholders (stock `/demo/*.webp`) — replace with the client's real photos/menu from the admin panel.
- Sign-in: **Google (Gmail)**, then name + phone are required at checkout. (Mobile-number + OTP exists as a per-site option — `settings.auth.mode='phone'` — but needs an SMS provider; keep Google.)
- "عجلة أبتاون" (wheel): one free spin per day per account, prize saved on the account (no code), auto-applied when the order ≥ 100 ₪, weekly cap on big prizes, draw is server-side only (`functions/api/wheel/spin.js`). Admin: *Wheel game* section.
- The "database" for Uptown = ONE JSON file: `public/seed/uptown-config.json` (menu, branches, colors, texts, wheel). It is loaded into KV key `config`. Firestore starts EMPTY (orders, users, prizes, spins are created by use) — there is no customer data to migrate.
- Logo: `public/demo/uptown-logo.png`. Regenerate the seed with `node tools/export-uptown-seed.mjs google` (source of truth: `tests/uptown-config.mjs`).
- The old demo lives at `platform-89w.pages.dev/s/uptown` (on the agency's accounts) — do not touch it.

## 2. Accounts to create (the human does this once; ~20 min)
1. **Gmail** of the restaurant owner → use it for everything below.
2. **GitHub**: new account → new PRIVATE repo `uptown-site`; push this code (unzip → `git init` → commit → push).
3. **Firebase** (console.firebase.google.com): new project → *Build › Authentication › Sign-in method*: enable **Google** → *Firestore Database* (production mode, a nearby region) → *Project settings › General*: register a **Web app** (copy apiKey, appId, messagingSenderId, authDomain) → *Cloud Messaging*: Web Push certificate (VAPID key) → *Service accounts*: generate a private key (JSON). **Stay on the Spark (free) plan; do NOT add a billing account** — then it is impossible to be charged. Add the final domain under *Authentication › Settings › Authorized domains*.
4. **Cloudflare**: new account → *Workers & Pages › Create › Pages › Connect to Git* (the repo, build command empty, output dir `public`) → *KV*: create a namespace and bind it to the project as **`STORE`** (Settings › Bindings, production + preview).
5. Give the new chat: nothing secret in chat. Put secrets only in Cloudflare *Settings › Variables and Secrets* (type **Secret**).

## 3. Environment variables (Cloudflare Pages › Settings › Variables, production)
`ADMIN_PASSWORD` (new, long, random — NOT the old one) · `FIREBASE_PROJECT_ID` · `FIREBASE_API_KEY` · `FIREBASE_AUTH_DOMAIN` · `FIREBASE_APP_ID` · `FIREBASE_MESSAGING_SENDER_ID` · `FIREBASE_VAPID_KEY` · `FIREBASE_CLIENT_EMAIL` · `FIREBASE_PRIVATE_KEY` (from the service-account JSON; keep the `\n`s) · `OTP_SECRET` (random, even if unused).
Then: `npx wrangler login`, `npm i`, `npm run seed:uptown` (loads the menu into KV), deploy `firestore.rules` (`npx firebase deploy --only firestore:rules --project <id>`), open the site, `/admin`, sign in with the admin password, upload the real photos/prices.
Needs the human's machine or CI for `wrangler login` — the human can run these two commands, or add a Cloudflare API token to a CI job.

## 4. Working style for the new chat
The owner gives short prompts; the assistant edits the code/config and deploys by pushing to GitHub (Cloudflare redeploys automatically). Content changes (prices, photos, texts) can be done through the admin panel or by editing `public/seed/uptown-config.json` + `npm run seed:uptown`. Always run `node --test tests/unit.test.mjs tests/phone-wheel.test.mjs` before pushing.

## 5. Requirement A — no vulnerabilities (be honest: aim for "no known holes", verify, never claim "impossible")
Already in place: Firestore rules deny all client writes except what the rules allow (orders go through server functions); admin only via signed token + password; customer identity from verified Firebase tokens; wheel draw and prize use are server-side in Firestore transactions; OTP stored as HMAC with rate limits; images validated; `_headers` has nosniff, SAMEORIGIN, HSTS, Referrer-Policy, Permissions-Policy.
TODO in the first session (do them, with tests):
1. Add a **Content-Security-Policy** (scripts: self + Firebase/Google gstatic, connect: self + googleapis/firebaseio/identitytoolkit, img: self data: blob:) — test login, orders, notifications, wheel in a real browser.
2. Rate-limit the admin login endpoint (KV counter) and lock out after N failures.
3. Review every `functions/api/**` route: auth check first, input validation (type, length, ids), no user text injected as HTML (`escapeHtml`/`textContent` in `public/js/*`), prices/discounts always recomputed server-side.
4. Check `firestore.rules` with the emulator (`npm run emulators`): a customer can read only their own docs, cannot write `prizes`, `spins`, `orders`, `users.points`.
5. Strong `ADMIN_PASSWORD`; rotate if ever pasted anywhere. Enable Cloudflare *Bot Fight Mode* and "Always HTTPS". Turn on GitHub secret scanning; never commit `.env`/service-account JSON.
6. Run `npm audit` and the code-review/security-review skills; fix findings.

## 6. Requirement B — always inside the free tier (even under attack or a traffic spike)
Limits (see README): CF Pages Functions 100k req/day, KV 100k reads / 1k writes per day, Firestore 50k reads / 20k writes per day, FCM free.
Rules: Firebase **Spark plan only, no card** (hard cap, never bills) · Cloudflare free plan has no overage billing (it just returns errors past the limit) · no paid services (no Twilio unless the owner chooses) · cache `/api/site` at the edge (already) · cap Firestore queries with `limit` · no polling loops; use `onSnapshot` only on the cashier screen · per-IP and per-account rate limits on `orders/create`, `wheel/spin`, auth endpoints (KV writes are scarce: use the Cloudflare *Rate limiting rules* in the dashboard, which are free, instead of KV counters where possible) · add a daily-usage note to the admin panel · set Cloudflare + Firebase budget/usage alerts by email.

## 7. Requirement C — animations (subtle, fast, accessible, mobile-friendly, CSS/Canvas only — no heavy libraries)
- Page load: staggered fade-up for hero, categories, product cards (IntersectionObserver, 40–60 ms stagger).
- Product cards: lift + soft shadow on hover/tap; add-to-cart: item flies to the cart icon + cart badge bounce; button press ripple.
- Header/menu: sticky header shadow on scroll; category chips slide indicator.
- Hero: slow zoom (Ken Burns) on slider images; gentle floating burger/wings decoration in brand red.
- Wheel: keep the existing spin; add idle pulse on the floating button and a glow around the banner.
- Checkout/order status: animated progress steps; success check-mark draw.
- Respect `prefers-reduced-motion: reduce` (turn all of it off), animate only `transform`/`opacity`, keep Lighthouse performance ≥ 90 and zero layout shift.
Put it in `public/css/animations.css` + `public/js/animations.js`, loaded by all pages.

## 8. First prompt to paste in the new chat
> اقرأ HANDOFF-UPTOWN.md في هذا الريبو. حسابات GitHub/Cloudflare/Firebase الجديدة جاهزة (أو سأجهّزها الآن). نفّذ: (1) نشر الموقع وتحميل `uptown-config.json`، (2) بند الأمان (القسم 5) مع اختبارات، (3) حماية الحدود المجانية (القسم 6)، (4) الانيميشن (القسم 7). اعمل بنفسك ولا تسألني إلا عن الأسرار التي لا أستطيع إعطاءها لك في المحادثة.
