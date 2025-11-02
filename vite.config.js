import { defineConfig } from 'vite';

// For GitHub Pages:
// - If repo is named 'username.github.io', use base: '/'
// - Otherwise, use base: '/repository-name/'
// Example: base: '/strudelism/' if repo is 'username/strudelism'
function getBasePath() {
  // In GitHub Actions, use repository name for base path
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY) {
    const repoName = process.env.GITHUB_REPOSITORY.split('/')[1];
    // Special case: user.github.io repos should use '/'
    if (repoName.endsWith('.github.io')) {
      return '/';
    }
    return `/${repoName}/`;
  }
  // For production builds outside GitHub Actions
  if (process.env.NODE_ENV === 'production') {
    return '/';
  }
  // For development
  return './';
}

export default defineConfig({
  base: getBasePath(),
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});

