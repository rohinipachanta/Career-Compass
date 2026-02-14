# Railway Deployment Guide

## Code Changes (Already Done)

The following changes have been made to your codebase:

1. ✅ Removed Replit-specific Vite plugins from package.json
2. ✅ Updated vite.config.ts to remove Replit dependencies
3. ✅ Updated session configuration in server/routes.ts for Railway
4. ✅ Created railway.toml configuration file
5. ✅ Removed .replit configuration file

## Railway Deployment Steps

### 1. Install Dependencies

```bash
npm install
```

This will remove the old Replit packages and ensure your lock file is up to date.

### 2. Create a Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (recommended for easy deployment)

### 3. Create a New Project

1. Click "New Project" in Railway dashboard
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub repositories
4. Select your Career-Compass repository

### 4. Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically provision a PostgreSQL database
4. The DATABASE_URL will be automatically injected as an environment variable

### 5. Configure Environment Variables

In your Railway project settings, add these variables:

**Required:**
- `NODE_ENV` = `production`
- `SESSION_SECRET` = (generate a secure random string, e.g., use `openssl rand -base64 32`)
- `OPENAI_API_KEY` = (your OpenAI API key)

**Auto-configured by Railway:**
- `PORT` (Railway sets this automatically)
- `DATABASE_URL` (automatically set when you add PostgreSQL)

### 6. Configure Build & Deploy Settings

Railway should auto-detect your configuration from railway.toml, but verify:

- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Watch Paths**: `/**` (default)

### 7. Deploy

1. Push your code changes to GitHub
2. Railway will automatically detect the push and start building
3. First deployment will:
   - Install dependencies
   - Run database migrations (via drizzle-kit)
   - Build the application
   - Start the server

### 8. Run Database Migrations

After first deployment, you may need to push the database schema:

```bash
# Install Railway CLI locally
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Push database schema
railway run npm run db:push
```

Or use Railway's built-in shell in the dashboard.

### 9. Access Your Application

Once deployed, Railway will provide you with:
- A public URL (e.g., `your-app.up.railway.app`)
- You can also add a custom domain in Railway settings

### 10. Monitor Your Application

- View logs in Railway dashboard under "Deployments" → "Logs"
- Monitor metrics (CPU, Memory, Network) in the dashboard
- Set up alerts for crashes or high resource usage

## Environment Variables Summary

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `DATABASE_URL` | Yes* | PostgreSQL connection string | Auto-set by Railway |
| `SESSION_SECRET` | Yes | Secret for session encryption | Random 32+ char string |
| `OPENAI_API_KEY` | Yes | OpenAI API key for coaching | `sk-...` |
| `PORT` | No* | Server port | Auto-set by Railway |

*Auto-configured when using Railway's PostgreSQL service

## Database Schema Migration

The app uses Drizzle ORM. On first deploy:

1. Railway will create the PostgreSQL database
2. Run migrations using `npm run db:push` through Railway CLI or dashboard shell
3. The app will automatically create the session table on first request

## Troubleshooting

### App crashes on start
- Check logs for DATABASE_URL connection errors
- Verify all environment variables are set
- Ensure database migrations have been run

### Session issues
- Verify SESSION_SECRET is set
- Check that trust proxy is enabled (already configured)
- Ensure PostgreSQL session store table exists

### Build failures
- Check that all Replit dependencies were removed
- Run `npm install` locally to update package-lock.json
- Commit and push the updated package-lock.json

## Cost Estimation

Railway pricing (as of 2024):
- **Hobby Plan**: $5/month for 500 hours + $5 usage credit
- **PostgreSQL**: Included in usage
- **Estimated cost**: $5-10/month for a small app

## Optional: Custom Domain

1. Go to your Railway project settings
2. Click "Settings" → "Domains"
3. Click "Custom Domain"
4. Follow instructions to configure DNS

## Differences from Replit

| Feature | Replit | Railway |
|---------|--------|---------|
| Database | Built-in PostgreSQL | Add PostgreSQL service |
| Environment vars | Secrets tab | Variables tab |
| Deployment | Always running | Auto-deploy on git push |
| Logs | Console | Dashboard logs |
| Scaling | Limited | Automatic |
| Custom domains | Limited | Full support |

## Next Steps

1. Remove the `server/replit_integrations` folder if you're not using those features
2. Test all functionality after deployment
3. Set up monitoring and alerts
4. Configure automatic backups for PostgreSQL in Railway