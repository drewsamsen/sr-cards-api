#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building for Vercel deployment...');

try {
  // Clean the dist directory if it exists
  if (fs.existsSync('dist')) {
    console.log('Cleaning dist directory...');
    if (process.platform === 'win32') {
      execSync('rmdir /s /q dist', { stdio: 'inherit' });
    } else {
      execSync('rm -rf dist', { stdio: 'inherit' });
    }
  }
  
  // Compile TypeScript
  console.log('Compiling TypeScript...');
  execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });
  
  // Ensure the dist directory exists
  if (!fs.existsSync('dist')) {
    console.error('Error: dist directory not found after TypeScript compilation');
    process.exit(1);
  }
  
  console.log('TypeScript compilation successful');
  
  // List the compiled files
  const distFiles = fs.readdirSync('dist');
  console.log('Compiled files:', distFiles);
  
  // Copy package.json to dist (for dependencies)
  console.log('Copying package.json to dist...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Simplify package.json for production
  const distPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    main: 'index.js',
    engines: {
      node: '18.x'
    },
    dependencies: packageJson.dependencies
  };
  
  fs.writeFileSync('dist/package.json', JSON.stringify(distPackageJson, null, 2));
  
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
} 