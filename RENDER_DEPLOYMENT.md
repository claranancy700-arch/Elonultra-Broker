# Render Deployment Guide

## Prerequisites
- GitHub account with your code pushed
- Render account (free tier available)
- PostgreSQL database on Render

## Step 1: Set Up PostgreSQL Database on Render

1. Go to [render.com](https://render.com) and sign in
2. Click **New** → **PostgreSQL**
3. Configure:
   - **Name**: `elonu-db` (or your choice)
   - **Database**: `elonu`
   - **User**: `elon_user` (or your choice)
   - **Region**: Choose closest to your users
   - **PostgreSQL Version**: 15 (latest)
   - **Plan**: Free tier is fine for testing
4. Click **Create Database**
5. Copy the **Internal Database URL** (starts with `postgresql://`)
   - Save this for Step 3

## Step 2: Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit for Render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 3: Create Web Service on Render

1. On Render dashboard, click **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `elonu-elon-web` (or your choice)
   - **Environment**: Node
   - **Region**: Same as database
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run server`
   - **Plan**: Free tier

4. Click **Advanced** and add environment variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5001`
   - `DATABASE_URL`: Paste the PostgreSQL URL from Step 1
   - `JWT_SECRET`: Generate a strong random string (e.g., `openssl rand -base64 32`)
   - `ADMIN_KEY`: Generate another strong random string for admin access

5. Click **Create Web Service**

Wait for deployment to complete (usually 2-5 minutes).

## Step 4: Verify Deployment

1. Once deployed, Render will give you a URL like `https://elonu-elon-web.onrender.com`
2. Test the application:
   - Visit `https://elonu-elon-web.onrender.com`
   - Log in with test account
   - Check admin panel
   - Test a withdrawal flow

## Step 5: Update DNS (Optional)

To use a custom domain:
1. On Render service page, go to **Settings**
2. Under **Domains**, click **Add Custom Domain**
3. Point your DNS to the Render URL

## Troubleshooting

### Application not starting?
- Check **Logs** tab for errors
- Verify DATABASE_URL is correct
- Ensure all environment variables are set

### Database connection failed?
- Copy the **Internal Database URL** from the Postgres service
- Not the **External Database URL**
- Verify credentials match

### API endpoints returning 404?
- Ensure `npm run server` is being used
- Check that static files are in the root directory

### Accessing Admin Panel

Admin URL: `https://elonu-elon-web.onrender.com/admin.html`

You'll need:
- Admin key (set in environment variables)
- User email/password

## Key Files for Deployment

- `render.yaml` - Render configuration
- `Procfile` - Process file (backup)
- `package.json` - Dependencies and start scripts
- `.env.example` - Environment variable template
- `src/server.js` - Express server entry point

## Environment Variables Needed

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=long-random-string-here
ADMIN_KEY=admin-key-here
NODE_ENV=production
PORT=5001
```

## Important Notes

- **Free tier**: Applications spin down after 15 minutes of inactivity
- **Database persistence**: Data is persistent even if app spins down
- **Upgrades**: Switch to paid plan for always-on service
- **Auto-deploy**: GitHub commits automatically trigger redeployment

## Monitoring

Use Render dashboard to:
- View real-time logs
- Monitor disk and memory usage
- Check deployment history
- Restart service if needed

---

For support: Contact Render support or check their documentation at [render.com/docs](https://render.com/docs)
