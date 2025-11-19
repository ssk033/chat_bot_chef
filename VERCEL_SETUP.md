# Quick Vercel Setup Guide

## ⚠️ IMPORTANT: Add DATABASE_URL Environment Variable

Your deployment is failing because `DATABASE_URL` is missing. Follow these steps:

### Step 1: Get Your Database Connection String

#### Option A: Using Neon (Free PostgreSQL with pgvector)
1. Go to [Neon Console](https://console.neon.tech)
2. Sign up/Login (free tier available)
3. Create a new project
4. Go to **Connection Details**
5. Copy the **Connection String**
   - It looks like: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`

#### Option B: Using Existing PostgreSQL
- Format: `postgresql://username:password@host:port/database?sslmode=require`
- Replace with your actual database credentials

### Step 2: Add to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project (`chat_bot_chef`)
3. Go to **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)
5. Click **Add New** button
6. Fill in:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste your connection string from Step 1
   - **Environment**: Select all three:
     - ☑️ Production
     - ☑️ Preview  
     - ☑️ Development
7. Click **Save**

### Step 3: Enable pgvector Extension

After adding DATABASE_URL, enable the vector extension in your database:

1. Connect to your database (using psql, pgAdmin, or Neon SQL Editor)
2. Run this SQL command:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### Step 4: Run Database Migrations

Your database needs the tables. You can either:

**Option A: Run locally and push**
```bash
npx prisma migrate deploy
```

**Option B: Run via Vercel (if you have database access)**
- Connect to your database
- Run the migration SQL from `prisma/migrations/`

### Step 5: Redeploy

1. Go to Vercel Dashboard → Your Project
2. Click **Deployments** tab
3. Click **Redeploy** on the latest deployment
4. Or push a new commit to trigger auto-deploy

### Step 6: Load Recipes (Optional)

After deployment works, you can load recipes:
```bash
npm run load
```

**Note**: This needs to run locally or via a script, as it requires the model files.

---

## ✅ Verification

After adding DATABASE_URL and redeploying:
- The error should be gone
- You should see: "I don't have any recipes in my database yet" (if no recipes loaded)
- Or actual recipe responses (if recipes are loaded)

---

## 🆘 Still Having Issues?

1. **Check Vercel Logs**:
   - Vercel Dashboard → Deployments → Latest → View Function Logs
   - Look for specific error messages

2. **Verify DATABASE_URL**:
   - Make sure it's added to all environments (Production, Preview, Development)
   - Check the connection string format is correct
   - Ensure database allows connections from Vercel IPs

3. **Database Connection**:
   - Test connection string locally
   - Verify database is accessible
   - Check firewall/security settings

