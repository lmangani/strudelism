#!/usr/bin/env node
// Simple script to generate package-lock.json
const fs = require('fs');
const https = require('https');

function fetchPackage(name) {
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/${name}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const pkg = JSON.parse(data);
          const latest = pkg['dist-tags'].latest;
          const version = pkg.versions[latest];
          resolve({
            version: latest,
            integrity: version.dist.integrity,
            resolved: version.dist.tarball,
            dependencies: version.dependencies || {}
          });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching package info...');
  const web = await fetchPackage('@strudel/web');
  const vite = await fetchPackage('vite');
  
  const lockfile = {
    "name": "strudelism",
    "version": "1.0.0",
    "lockfileVersion": 3,
    "requires": true,
    "packages": {
      "": {
        "name": "strudelism",
        "version": "1.0.0",
        "license": "ISC",
        "dependencies": {
          "@strudel/web": "^1.2.6",
          "vite": "^5.4.10"
        }
      },
      "node_modules/@strudel/web": {
        "version": web.version,
        "resolved": web.resolved,
        "integrity": web.integrity,
        "dependencies": Object.keys(web.dependencies).reduce((acc, key) => {
          acc[key] = Object.values(web.dependencies)[Object.keys(web.dependencies).indexOf(key)];
          return acc;
        }, {})
      },
      "node_modules/vite": {
        "version": vite.version,
        "resolved": vite.resolved,
        "integrity": vite.integrity
      }
    }
  };
  
  fs.writeFileSync('package-lock.json', JSON.stringify(lockfile, null, 2));
  console.log('package-lock.json created successfully!');
}

main().catch(console.error);

