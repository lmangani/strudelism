# Deployment Guide

## GitHub Pages Setup

### Initial Setup

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/strudelism.git
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**
   - Save

3. **Deploy:**
   - The GitHub Actions workflow will automatically run when you push to `main`
   - Check the **Actions** tab to see the deployment progress
   - Once complete, your site will be live at `https://YOUR_USERNAME.github.io/strudelism/`

### Workflow Details

The `.github/workflows/deploy.yml` file handles:
- ✅ Installing dependencies
- ✅ Building the project with Vite
- ✅ Deploying to GitHub Pages

The workflow triggers on:
- Pushes to the `main` branch
- Manual workflow dispatch (via Actions tab)

### Troubleshooting

**Build fails:**
- Check the Actions tab for error details
- Ensure `package.json` has all dependencies
- Verify Node.js version (workflow uses Node 20)

**Pages not showing:**
- Wait a few minutes for deployment to complete
- Check repository Settings → Pages → confirm "GitHub Actions" is selected
- Verify the workflow completed successfully in Actions tab

**404 errors:**
- The Vite config automatically detects the repository name during GitHub Actions
- If you still get 404 errors, manually update `base` in `vite.config.js`:
  ```js
  base: '/your-repo-name/'
  ```
- Replace `your-repo-name` with your actual repository name

### Manual Deployment

You can also build locally and deploy manually:

```bash
npm run build
# Then upload the dist/ folder to your hosting service
```

## Other Hosting Options

### Netlify

1. Connect your GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Deploy!

### Vercel

1. Connect your GitHub repository
2. Vite is auto-detected
3. Deploy!

### Cloudflare Pages

1. Connect your GitHub repository
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Deploy!

