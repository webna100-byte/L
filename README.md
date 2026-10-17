# Restaurant Ordering Website — White Label

A complete online-ordering website for any restaurant: menu, cart, pickup & delivery, loyalty points, gifts and levels, a live cashier screen with a ringing alarm, push notifications and a full admin panel.
Every site runs in **one language** — English, Español, Français, Deutsch, Italiano, Português, Nederlands or العربية — and carries only the restaurant's own brand.
It all runs on the **free plans** of Cloudflare and Firebase.

| Part | Service | Notes |
|---|---|---|
| Website & pages | Cloudflare Pages | `public/` folder |
| Server (orders, points, cashiers, notifications) | Cloudflare Pages Functions | `functions/` folder |
| Menu, settings, images, notifications | Cloudflare KV | binding named `STORE` |
| Customer sign-in (Google) | Firebase Authentication | |
| Orders, customer points, cashiers | Cloud Firestore | browsers read only, the server writes |
| Push notifications (Android / iPhone / desktop) | Firebase Cloud Messaging | |

## Features

- **One language per site.** The language is chosen in *Admin › Restaurant Settings*: the whole website, receipts and push notifications follow it, and prices use the local format (`12,50 €`, `€12.50`, `12,50 €`…). Visitors get no language switch.
- **White label.** Name, logo, colors, images, texts, social links and link previews (WhatsApp / Facebook) all come from the admin panel; the installed app icon uses the restaurant's logo. No code edits per client.
- **Admin panel in the restaurant's language** (with a one-click switch to English for the agency).
- **Several demo restaurants on one deployment** — see [Demo sites](#demo-sites).
- **Header:** logo, cart, hamburger menu (sign in/out, privacy policy, refund policy).
- **Bottom bar:** Levels · Gifts · Home · Notifications · My Orders.
- **Menu:** categories bar (3 styles), product options (sizes with their own price, paid extras, free choices), product discounts, multiple locations.
- **Sign-in with Google only.** Browsing and the cart are open to everyone; placing an order needs sign-in.
- **Levels (Silver → Gold → Diamond)** by lifetime points, each with a permanent discount.
- **Gifts** redeemed with points; points are deducted in the same transaction that creates the order, so they can never be spent twice.
- **Discounts:** by order amount (percentage or fixed), on delivery (percentage, fixed or free), minimum delivery order, optional tax.
- **Cashier screen** `/cashier`: only its location's orders, alarm until each order is accepted or rejected, thermal printing (80 / 58 mm or A4), "busy" switch that pauses new orders.
- **Prices are recomputed on the server** from the stored menu; nothing the browser sends can change what a customer pays or earns.

## Demo sites

One deployment can host many restaurants, each with **its own link, language, menu, orders, customers, cashiers and admin password**. Use it to show prospects a demo with their own name before they buy.

1. Sign in to `/admin` with the master password (`ADMIN_PASSWORD`).
2. Open **Demo sites**, type the restaurant name, pick the language (currency and time zone follow), optionally set a demo admin password, and press **Create demo site**.
3. Send the link `https://your-site.pages.dev/s/<link-name>`.
   - `/s/<link-name>/menu` opens a page directly, `/s/<link-name>/admin` its admin panel.
   - `/s/main` goes back to the main site.
   - Link previews on WhatsApp / Facebook show the demo restaurant's name and image.
4. Open the demo's **Admin** button to replace the logo, colors, menu and photos.
5. With a demo password, the restaurant can sign in to `/admin` of **its own demo only**. Your master password works on every site and is the only one that can create or delete demos.

How it works: `/s/<link-name>` sets a `rs_site` cookie. The server keeps each demo's data apart (KV keys `site:<name>:…`, Firestore `/sites/<name>/…`), staff sign-ins carry the site they belong to, and the Firestore rules enforce it.
When a restaurant buys, give it its own deployment (below) and move its menu with *Backup & Data › Download backup* → *Restore*.

## Set up a restaurant (under an hour)

### 1) Firebase (about 15 minutes)
1. At [console.firebase.google.com](https://console.firebase.google.com) create a project on the free **Spark** plan.
2. **Authentication › Sign-in method:** enable **Google** only.
3. **Authentication › Settings › Authorized domains:** add `your-project.pages.dev` and the restaurant's domain.
4. **Firestore Database › Create database:** production mode, a nearby region (e.g. `eur3` for Europe). In **Rules**, paste `firestore.rules` and **Publish**.
5. **Project settings › General › Your apps:** add a Web app and copy `apiKey`, `projectId`, `appId`, `messagingSenderId`.
6. **Project settings › Cloud Messaging › Web Push certificates:** *Generate key pair* and copy the key (VAPID).
7. **Project settings › Service accounts › Generate new private key:** from the JSON file you need `client_email` and `private_key`.

### 2) Cloudflare (about 15 minutes)
1. Copy this repository for the client (or fork it).
2. **Workers & Pages › Create › Pages › Connect to Git:** pick the repository. Build command: empty. Build output directory: `public`.
3. **Workers & Pages › KV › Create namespace** (e.g. `rest-NAME`).
4. In the Pages project: **Settings › Bindings › Add › KV namespace**, name `STORE`, pick the namespace.
5. **Settings › Variables and Secrets** (mark sensitive ones as Secret):

| Variable | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | projectId |
| `FIREBASE_API_KEY` | apiKey |
| `FIREBASE_APP_ID` | appId |
| `FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `FIREBASE_VAPID_KEY` | Web Push key |
| `FIREBASE_CLIENT_EMAIL` | `client_email` from the JSON file |
| `FIREBASE_PRIVATE_KEY` (Secret) | `private_key` from the JSON file, as is (with `\n`) |
| `ADMIN_PASSWORD` (Secret) | master password of the admin panel |
| `FIREBASE_AUTH_DOMAIN` (optional) | the site's own domain — see "Google sign-in on iPhone" |

6. **Deployments › Retry deployment** so the variables apply.

### 3) Customize (about 20 minutes)
1. Open `https://your-site/admin`, sign in, choose the **website language**, currency and time zone, and press **Start from demo**.
2. **Restaurant Settings:** logo, name, language, currency, time zone, receipt width.
3. **Colors**, **Branches** (locations) and **Delivery Zones**, **Categories** and **Products**.
4. **Discounts** and **Points, Gifts & Levels**.
5. **Pages** (images and texts of the 7 pages) and **Homepage**.
6. **Cashiers:** one account per location; cashiers use `https://your-site/cashier`.
7. **Footer & Contact.**
8. Place a test order from your phone and watch it arrive at the cashier screen.

> Write all texts in the website's language. Changing the language later does not translate texts you already typed.

### Google sign-in on iPhone and the installed app
Safari blocks third-party storage, which can break sign-in when the site is installed on the home screen. Built-in fix:
1. Set `FIREBASE_AUTH_DOMAIN` to the site's domain (e.g. `rest-name.pages.dev`); `functions/__/auth/[[path]].js` serves the sign-in pages from the same domain.
2. In [Google Cloud Console › APIs & Services › Credentials](https://console.cloud.google.com/apis/credentials) open "Web client (auto created by Google Service)" and add to **Authorized redirect URIs**: `https://your-domain/__/auth/handler`

### iPhone notifications
iOS 16.4+ delivers web push **only after the site is added to the home screen** (an Apple rule). The Notifications page explains the steps to customers automatically. Android and desktop work right away.

## Free-plan limits (far above a normal restaurant)

| Service | Free limit | Usage |
|---|---|---|
| Cloudflare Pages Functions | 100,000 requests/day | a page view ≈ one `/api/site` request, cached at the edge |
| Cloudflare KV | 100,000 reads, 1,000 writes/day | writes only when the admin saves, uploads an image or sends a notification |
| Firestore | 50,000 reads, 20,000 writes/day | an order ≈ 3 writes, a status change ≈ 2 |
| Firebase Auth (Google) | no practical limit | |
| FCM | free | a broadcast = one request per site (topics) |

Images are compressed to WebP in the browser before upload and served with a one-year cache.

## Local development & tests

```bash
npm install
cp .dev.vars.example .dev.vars   # put any RSA private key in FIREBASE_PRIVATE_KEY
npm run emulators                 # Firestore + Auth emulators (needs Java)
npm run seed:local                # loads the demo data into local KV
npm run dev                       # http://127.0.0.1:8788
npm test                          # pricing, points, translations, demo-site logic
npm run test:api                  # 28 integration checks: orders, points, gifts, cashiers, rules, demo sites
PLAYWRIGHT=… FIREBASE_PKG=… npm run test:ui   # full flow in an iPhone-sized browser, incl. a Spanish demo
```

### Files
```
public/                    the website (Cloudflare Pages)
  js/i18n.js               storefront texts in 8 languages + single-language helpers
  js/admin-i18n.js         admin panel language loader
  js/admin-lang/<lang>.js  admin panel translations (English is the source)
  js/pricing.js            prices, discounts and points (shared by browser and server)
  js/store.js              restaurant data, cart, gift cart, per-site browser storage
  js/firebase.js           Firebase on demand, sign-in, notifications
  js/ui.js                 header, menu drawer, bottom bar, footer, money/date formats
  js/pages.js              sign-in, levels, gifts, my orders, notifications, policies
  js/admin.js              admin panel (incl. Demo sites)
  js/cashier.js            cashier screen
  js/receipt.js            thermal receipts
  seed/demo-config.json    demo restaurant, every text in all 8 languages
functions/                 the server (Pages Functions)
  _lib/site.js             which site a request belongs to (main site or a demo)
  s/[[path]].js            /s/<name> demo links
  api/site.js              public site data (edge cached)
  api/orders/*.js          create order / change status / delete
  api/auth/*.js            admin and cashier sign-in
  api/admin/*.js           settings, image upload, cashiers, notifications, demo sites
  _middleware.js           per-restaurant title, language and preview image
firestore.rules            Firestore security rules
```
