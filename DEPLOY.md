# Deployment Guide — SalesTrack on Render

Repo: https://github.com/sanatanisher01/sales

---

## Before you start — 2 things to prepare

### A) Firebase Web App config
1. Go to https://console.firebase.google.com/project/room-4cf55/settings/general
2. Scroll to "Your apps" → click the Web app (or click "Add app" → Web)
3. Note down these values:
   - `apiKey`
   - `appId`
   (the rest are already filled in render.yaml)

### B) Enable Firebase Authentication
1. Go to https://console.firebase.google.com/project/room-4cf55/authentication
2. Click "Get started" → Enable the **Anonymous** provider
   (needed for Firestore real-time listeners)

---

## Step 1 — Deploy Backend on Render

1. Go to https://render.com → Sign in with GitHub
2. Click **New +** → **Web Service**
3. Connect repo: `sanatanisher01/sales`
4. Settings:
   - **Name**: `salestrack-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Plan**: Free
5. Click **Advanced** → Add these Environment Variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `JWT_SECRET` | `salestrack_jwt_secret_room4cf55_secure_key_2024` |
| `JWT_EXPIRES_IN` | `30m` |
| `FIREBASE_PROJECT_ID` | `room-4cf55` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@room-4cf55.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | *(paste the full private key from your service account JSON — keep the \n characters)* |
| `VAPID_PUBLIC_KEY` | `BD0ED9G1sSuUdy-QKBHwU3vu5YA-c62QJHiN2tXpamD258fX8GD93o2A6I6SbDgvd-XU6DjHJkWfT7FSRjVMEX0` |
| `VAPID_PRIVATE_KEY` | `_ooQOLN4LvzyAUjD-marwXdC1EvLbnEnJMg_cxVmNUM` |
| `VAPID_SUBJECT` | `mailto:admin@salestrack.com` |
| `FRONTEND_URL` | *(leave blank for now — fill after Step 2)* |

6. Click **Create Web Service**
7. Wait for deploy → copy your backend URL e.g. `https://salestrack-backend.onrender.com`

---

## Step 2 — Deploy Frontend on Render

1. Click **New +** → **Static Site**
2. Connect repo: `sanatanisher01/sales`
3. Settings:
   - **Name**: `salestrack-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add these Environment Variables:

| Key | Value |
|-----|-------|
| `VITE_FIREBASE_API_KEY` | *(your Firebase apiKey from Step A)* |
| `VITE_FIREBASE_AUTH_DOMAIN` | `room-4cf55.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `room-4cf55` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `room-4cf55.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `118412863960313180091` |
| `VITE_FIREBASE_APP_ID` | *(your Firebase appId from Step A)* |
| `VITE_API_URL` | `https://salestrack-backend.onrender.com` *(your backend URL from Step 1)* |

5. Click **Create Static Site**
6. Wait for deploy → copy your frontend URL e.g. `https://salestrack-frontend.onrender.com`

---

## Step 3 — Link them together

1. Go back to your **backend** service on Render
2. Environment → update `FRONTEND_URL` = `https://salestrack-frontend.onrender.com`
3. Click **Save Changes** → backend auto-redeploys

---

## Step 4 — Deploy Firestore Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase use room-4cf55
firebase deploy --only firestore:rules
```

---

## Done!

| | URL |
|--|--|
| **App** | https://salestrack-frontend.onrender.com |
| **API** | https://salestrack-backend.onrender.com/api/health |

**Login**: admin@salestrack.com / Admin@123456

> Note: Free tier on Render spins down after 15 min of inactivity.
> First request after sleep takes ~30 seconds to wake up.
> Upgrade to Starter ($7/mo) to keep it always-on.
