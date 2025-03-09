#!/bin/bash

# This script is used by Vercel to debug the deployment
# It will be executed during the build process

echo "Current directory: $(pwd)"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Files in current directory:"
ls -la

echo "Building the project..."
npm run build:prod

echo "Files in dist directory after build:"
ls -la dist/

echo "Environment variables (sanitized):"
env | grep -v -E "TOKEN|KEY|SECRET|PASSWORD" | sort

echo "Build script completed" 