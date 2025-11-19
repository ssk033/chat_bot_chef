# Deployment Guide for Vercel

## Required Environment Variables

Add these in Vercel Dashboard → Your Project → Settings → Environment Variables:

### 1. **DATABASE_URL** (REQUIRED)
```
postgresql://user:password@host:port/database?sslmode=require
```

**How to get:**
- If using Neon (recommended): Get connection string from Neon dashboard
- If using other PostgreSQL: Use your database connection string
- Make sure pgvector extension is enabled in your database

### 2. **OLLAMA_BASE_URL** (OPTIONAL)
```
http://localhost:11434
```
**Note:** Ollama typically runs locally. For production, you have two options:
- **Option A:** Use a cloud Ollama service (like RunPod, Modal, etc.)
- **Option B:** Remove Ollama dependency and use fallback responses

**If not set:** Defaults to `http://localhost:11434` (won't work on Vercel)

### 3. **OLLAMA_MODEL** (OPTIONAL)
```
llama3.2:1b
```
**If not set:** Defaults to `llama3.2:1b`

### 4. **MAX_RECIPES_TO_LOAD** (OPTIONAL - for load script only)
```
10000
```
Only needed when running `npm run load` locally.

---

## Important Notes for Vercel Deployment

### ⚠️ Model Files
The trained model (`models/recipe-embedder/`) is in `.gitignore` and won't be deployed to Vercel.

**Solutions:**
1. **Option A:** Upload model to a cloud storage (S3, Cloudflare R2) and download during build
2. **Option B:** Include model in Git (not recommended - large files)
3. **Option C:** Use a separate inference service for embeddings

### ⚠️ Python Runtime
Vercel doesn't support Python by default. The `scripts/inference.py` won't work on Vercel.

**Solutions:**
1. **Option A:** Use a separate Python service (like Railway, Render) for embeddings
2. **Option B:** Convert to Node.js using ONNX Runtime or similar
3. **Option C:** Use a cloud ML service API

### ⚠️ Ollama on Vercel
Ollama cannot run on Vercel serverless functions.

**Solutions:**
1. Use a cloud Ollama service
2. Use OpenAI/Anthropic API instead
3. Use fallback responses (no LLM)

---

## Step-by-Step Vercel Setup

### 1. Add Environment Variables (REQUIRED)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`chat_bot_chef`)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add these variables:

#### **DATABASE_URL** (REQUIRED - MUST ADD THIS!)
- **Key**: `DATABASE_URL`
- **Value**: Your PostgreSQL connection string
  ```
  postgresql://user:password@host:port/database?sslmode=require
  ```
- **Environment**: Select **Production**, **Preview**, and **Development** (all three)
- Click **Save**

**How to get DATABASE_URL:**
- **Neon (Recommended)**: 
  1. Go to [Neon Console](https://console.neon.tech)
  2. Select your project
  3. Go to **Connection Details**
  4. Copy the **Connection String**
  5. It looks like: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`

- **Other PostgreSQL**:
  - Format: `postgresql://username:password@host:port/database?sslmode=require`
  - Replace with your actual credentials

#### **OLLAMA_BASE_URL** (OPTIONAL)
- **Key**: `OLLAMA_BASE_URL`
- **Value**: Your Ollama service URL (if using cloud Ollama)
- **Environment**: All environments
- **Note**: Leave empty if not using Ollama (fallback will work)

#### **OLLAMA_MODEL** (OPTIONAL)
- **Key**: `OLLAMA_MODEL`
- **Value**: `llama3.2:1b` (or your preferred model)
- **Environment**: All environments

### 2. Database Setup
1. Make sure your database has:
   - PostgreSQL with pgvector extension
   - Tables created (run `npx prisma migrate deploy` if needed)
   - Recipes loaded (run `npm run load` locally or via script)

### 3. Build Settings
Vercel will auto-detect Next.js. No special build settings needed.

### 4. Deploy
1. Push to GitHub
2. Vercel will auto-deploy
3. Check deployment logs for errors

---

## Alternative: Use Cloud Services

### For Embeddings (instead of local Python):
- **OpenAI Embeddings API**
- **Cohere Embeddings**
- **Hugging Face Inference API**

### For LLM (instead of Ollama):
- **OpenAI API**
- **Anthropic Claude API**
- **Google Gemini API**

---

## Testing After Deployment

1. Check if app loads: `https://your-app.vercel.app`
2. Test a query: Try "chicken recipe"
3. Check logs: Vercel Dashboard → Deployments → View Function Logs

---

## Troubleshooting

### Generic Error: "Sorry, I encountered an error..."
This usually means one of these issues:

1. **Database Connection Error**
   - Check `DATABASE_URL` in Vercel environment variables
   - Verify database is accessible from Vercel
   - Check Vercel function logs for specific error

2. **Embedding Model Error** (Most Common on Vercel)
   - Python inference script won't work on Vercel
   - Error will show: "Python inference failed" or "Model not found"
   - **Solution**: Use cloud embedding service (OpenAI, Cohere, etc.)

3. **Vector Search Error**
   - pgvector extension not enabled
   - Error will show: "operator does not exist" or "vector"
   - **Solution**: Run `CREATE EXTENSION IF NOT EXISTS vector;` in database

4. **Database Tables Missing**
   - Error will show: "relation does not exist"
   - **Solution**: Run `npx prisma migrate deploy` or migrations

### How to Debug:
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on latest deployment → View Function Logs
3. Look for error messages starting with "❌"
4. Check the specific error type mentioned above

### Common Vercel-Specific Issues:

**Issue**: Embedding generation fails
- **Cause**: Python scripts don't work on Vercel
- **Fix**: Replace `lib/embedding-model.ts` to use cloud API instead

**Issue**: Database connection timeout
- **Cause**: Database not allowing Vercel IPs
- **Fix**: Whitelist Vercel IPs or use connection pooling

**Issue**: Function timeout
- **Cause**: Embedding generation takes too long
- **Fix**: Use faster embedding service or increase timeout

