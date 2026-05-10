# Deployment Guide — SalesTrack on Render

Repo: https://github.com/sanatanisher01/sales

---

## Before you start — Enable Firebase Authentication

1. Go to https://console.firebase.google.com/project/room-4cf55/authentication
2. Click **Get started**
3. Click **Anonymous** → Enable → Save

This is required for Firestore real-time listeners to work.

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
| `FIREBASE_PRIVATE_KEY` | *(see note below)* |
| `VAPID_PUBLIC_KEY` | `BD0ED9G1sSuUdy-QKBHwU3vu5YA-c62QJHiN2tXpamD258fX8GD93o2A6I6SbDgvd-XU6DjHJkWfT7FSRjVMEX0` |
| `VAPID_PRIVATE_KEY` | `_ooQOLN4LvzyAUjD-marwXdC1EvLbnEnJMg_cxVmNUM` |
| `VAPID_SUBJECT` | `mailto:admin@salestrack.com` |
| `FRONTEND_URL` | *(leave blank — fill after Step 2)* |

### FIREBASE_PRIVATE_KEY note
Paste the entire private key from your service account JSON file.
In Render, paste it exactly as-is including the `-----BEGIN PRIVATE KEY-----` header.
Render handles multiline env vars correctly.

6. Click **Create Web Service**
7. Wait ~3 min for deploy → copy your URL: `https://salestrack-backend.onrender.com`

---

## Step 2 — Deploy Frontend on Render

1. Click **New +** → **Static Site**
2. Connect repo: `sanatanisher01/sales`
3. Settings:
   - **Name**: `salestrack-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add these Environment Variables (all pre-filled):

| Key | Value |
|-----|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyAak_2lmhiWHJdKKOVlxSb-gNPyYzkxYCU` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `room-4cf55.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `room-4cf55` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `room-4cf55.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `24195041950` |
| `VITE_FIREBASE_APP_ID` | `1:24195041950:web:1e285e692a9dddc60a898f` |
| `VITE_API_URL` | `https://salestrack-backend.onrender.com` |

5. Click **Create Static Site**
6. Wait ~2 min → copy your URL: `https://salestrack-frontend.onrender.com`

---

## Step 3 — Link Backend to Frontend

1. Go to your **salestrack-backend** service on Render
2. **Environment** tab → add/update:
   - `FRONTEND_URL` = `https://salestrack-frontend.onrender.com`
3. Click **Save Changes** → backend redeploys automatically

---

## Step 4 — Deploy Firestore Security Rules (optional but recommended)

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
| **App (Frontend)** | https://salestrack-frontend.onrender.com |
| **API (Backend)** | https://salestrack-backend.onrender.com/api/health |

**Admin login**: admin@salestrack.com / Admin@123456

> Free tier note: Render free services sleep after 15 min of inactivity.
> First request after sleep takes ~30 sec to wake up.
> Upgrade to Starter ($7/mo) for always-on.
