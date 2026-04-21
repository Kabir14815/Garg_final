# Deploy Garg Jewellers

Deploy the **frontend** on Vercel and **backend** on Render (both free tiers).

---

## 1. Deploy backend (Render)

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New** → **Web Service**.
3. Connect your repo `Kabir14815/Garg_final`.
4. Render will detect `render.yaml`. If not, set:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Runtime:** Python 3
5. Add **Environment Variables:**
   - `MONGODB_URI` = your MongoDB Atlas connection string  
     `mongodb+srv://Task:YOUR_PASSWORD@cluster0.lnxh7gs.mongodb.net/?retryWrites=true&w=majority`
   - `MONGODB_DB_NAME` = `garg` (optional, defaults to garg)
6. Click **Create Web Service**. Wait for deploy.
7. Copy your backend URL (e.g. `https://garg-api-xxxx.onrender.com`).

---

## 2. Deploy frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New** → **Project**.
3. Import `Kabir14815/Garg_final`.
4. Vercel will detect Vite. Use defaults:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add **Environment Variable:**
   - **Name:** `VITE_API_URL`  
   - **Value:** your Render backend URL (e.g. `https://garg-api-xxxx.onrender.com`)
6. Click **Deploy**. Wait for build.
7. Copy your frontend URL (e.g. `https://garg-final.vercel.app`).

---

## 3. Allow frontend in backend CORS

1. In Render → your backend service → **Environment**.
2. Add:
   - **Name:** `CORS_ORIGINS`  
   - **Value:** your Vercel URL (e.g. `https://garg-final.vercel.app`)
3. Save. Render will redeploy.

---

## Done

- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-api.onrender.com`
- Admin: Login with `admin@garg.com` / `1234`

---

**Note:** On Render free tier, the backend sleeps after ~15 minutes of inactivity. The first request after that may take 30–60 seconds. Products and metal rates are stored in memory and reset on restart; users are stored in MongoDB.
