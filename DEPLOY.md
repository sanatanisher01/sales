# Deployment Guide — SalesTrack

## Before you start — get Firebase Web App config

1. Go to https://console.firebase.google.com/project/room-4cf55/settings/general
2. Scroll to "Your apps" → click the Web app (or create one if none exists)
3. Copy the firebaseConfig object values into the files below

---

## Step 1 — Fill Firebase Web Config

Edit `frontend/.env` and `frontend/.env.production` — replace the XXXX placeholders:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=room-4cf55.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=room-4cf55
VITE_FIREBASE_STORAGE_BUCKET=room-4cf55.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=118412863960313180091
VITE_FIREBASE_APP_ID=1:118412863960313180091:web:...
```

---

## Step 2 — Enable Firebase Authentication

1. Go to https://console.firebase.google.com/project/room-4cf55/authentication
2. Click "Get started"
3. Enable "Anonymous" provider (needed for custom token sign-in)

---

## Step 3 — Deploy Firestore Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase use room-4cf55
firebase deploy --only firestore:rules
```

---

## Step 4 — Deploy Backend to Railway

1. Go to https://railway.app and sign up / log in
2. Click "New Project" → "Deploy from GitHub repo"
   OR use CLI:
   ```bash
   railway login
   railway init        # creates new project
   railway up          # deploys from backend/ folder
   ```
3. In Railway dashboard → your service → Variables, add ALL these:
   ```
   PORT=5000
   NODE_ENV=production
   JWT_SECRET=salestrack_jwt_secret_room4cf55_secure_key_2024
   JWT_EXPIRES_IN=30m
   FIREBASE_PROJECT_ID=room-4cf55
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@room-4cf55.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCe8Q8qWtzgP8SK\n...\n-----END PRIVATE KEY-----\n"
   VAPID_PUBLIC_KEY=BD0ED9G1sSuUdy-QKBHwU3vu5YA-c62QJHiN2tXpamD258fX8GD93o2A6I6SbDgvd-XU6DjHJkWfT7FSRjVMEX0
   VAPID_PRIVATE_KEY=_ooQOLN4LvzyAUjD-marwXdC1EvLbnEnJMg_cxVmNUM
   VAPID_SUBJECT=mailto:admin@salestrack.com
   FRONTEND_URL=https://your-netlify-site.netlify.app
   ```
4. Railway will give you a URL like: https://salestrack-backend.railway.app
5. Copy that URL

---

## Step 5 — Update Frontend with Backend URL

Edit `frontend/.env.production`:
```
VITE_API_URL=https://salestrack-backend.railway.app
```

---

## Step 6 — Deploy Frontend to Netlify

```bash
cd frontend
npm run build
netlify login
netlify deploy --prod --dir=dist
```

Netlify will give you a URL like: https://salestrack-app.netlify.app

---

## Step 7 — Update Railway FRONTEND_URL

Go back to Railway → Variables → update:
```
FRONTEND_URL=https://salestrack-app.netlify.app
```

---

## Step 8 — Done!

Your app is live at: https://salestrack-app.netlify.app

Login: admin@salestrack.com / Admin@123456
