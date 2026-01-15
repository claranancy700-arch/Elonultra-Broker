#!/usr/bin/env bash

# Quick Render Setup - Copy these commands to your terminal

# 1. Initialize git if needed
# git init
# git add .
# git commit -m "Ready for Render deployment"
# git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
# git branch -M main
# git push -u origin main

# 2. Generate strong secrets for Render env vars:
echo "JWT_SECRET: $(openssl rand -base64 32)"
echo "ADMIN_KEY: $(openssl rand -base64 32)"

# 3. Then follow steps in RENDER_DEPLOYMENT.md:
# - Create PostgreSQL database
# - Create Web Service
# - Add environment variables
# - Deploy!
