#!/bin/bash

# Supabase Setup Helper Script for Gallifrey
# This script helps you set up Supabase interactively

set -e

echo "🚀 Gallifrey - Supabase Setup Helper"
echo "====================================="
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "✅ .env file found"
    source .env
else
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
fi

# Function to update .env file
update_env() {
    local key=$1
    local value=$2

    if grep -q "^${key}=" .env; then
        # Update existing key
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" .env
        else
            sed -i "s|^${key}=.*|${key}=${value}|" .env
        fi
    else
        # Add new key
        echo "${key}=${value}" >> .env
    fi
}

echo ""
echo "📋 Step 1: Supabase Project Setup"
echo "=================================="
echo ""
echo "Before continuing, please:"
echo "1. Go to https://supabase.com"
echo "2. Create a new project (or use an existing one)"
echo "3. Wait for the project to finish setting up"
echo ""
read -p "Press Enter once your Supabase project is ready..."

echo ""
echo "📋 Step 2: Get Your Supabase Credentials"
echo "========================================="
echo ""
echo "In your Supabase dashboard:"
echo "1. Go to Project Settings → API"
echo "2. Copy the values below"
echo ""

# Get Supabase URL
read -p "Enter your Supabase URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
update_env "EXPO_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"

# Get Supabase Anon Key
echo ""
read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY
update_env "EXPO_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"

# Extract project ID from URL
PROJECT_ID=$(echo $SUPABASE_URL | sed -E 's|https://([^.]+)\.supabase\.co|\1|')
update_env "SUPABASE_PROJECT_ID" "$PROJECT_ID"

echo ""
echo "✅ Environment variables configured!"
echo ""

echo "📋 Step 3: Run Database Migrations"
echo "==================================="
echo ""
echo "Choose how to run migrations:"
echo "1. Automatically (requires Supabase CLI)"
echo "2. Manually (copy SQL to Supabase dashboard)"
echo ""
read -p "Enter choice (1 or 2): " MIGRATION_CHOICE

if [ "$MIGRATION_CHOICE" == "1" ]; then
    echo ""
    echo "Checking for Supabase CLI..."

    if ! command -v supabase &> /dev/null; then
        echo "❌ Supabase CLI not found"
        echo ""
        echo "Install with: npm install -g supabase"
        echo ""
        echo "After installing, run this script again or choose option 2 for manual migration."
        exit 1
    fi

    echo "✅ Supabase CLI found"
    echo ""
    echo "Logging in to Supabase..."
    supabase login

    echo ""
    echo "Linking to project..."
    supabase link --project-ref $PROJECT_ID

    echo ""
    echo "Running migrations..."
    supabase db push

    echo ""
    echo "✅ Migrations completed!"
else
    echo ""
    echo "📋 Manual Migration Instructions:"
    echo "=================================="
    echo ""
    echo "1. Go to your Supabase dashboard: $SUPABASE_URL"
    echo "2. Navigate to SQL Editor"
    echo "3. Click 'New Query'"
    echo "4. Copy the contents of: supabase/migrations/001_initial_schema.sql"
    echo "5. Paste into the SQL editor"
    echo "6. Click 'Run'"
    echo ""
    read -p "Press Enter once you've completed the migration..."
fi

echo ""
echo "📋 Step 4: Generate TypeScript Types"
echo "====================================="
echo ""
echo "Generating types from your database schema..."

if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js"
    exit 1
fi

# Create types directory if it doesn't exist
mkdir -p src/types

npx supabase gen types typescript --project-id $PROJECT_ID --schema public > src/types/supabase.ts

echo "✅ Types generated at src/types/supabase.ts"

echo ""
echo "📋 Step 5: Set Up Storage (Optional)"
echo "===================================="
echo ""
echo "To enable media uploads (photos/videos):"
echo "1. Go to Storage in your Supabase dashboard"
echo "2. Create a new bucket named 'media'"
echo "3. Make it public"
echo "4. See SUPABASE_SETUP.md for storage policies"
echo ""
read -p "Skip this for now? (y/n): " SKIP_STORAGE

if [ "$SKIP_STORAGE" != "y" ]; then
    echo ""
    echo "See SUPABASE_SETUP.md for detailed storage setup instructions."
fi

echo ""
echo "✅ Supabase Setup Complete!"
echo "=========================="
echo ""
echo "Your configuration:"
echo "  • Project URL: $SUPABASE_URL"
echo "  • Project ID: $PROJECT_ID"
echo "  • .env file: Updated ✅"
echo "  • Database: Migrated ✅"
echo "  • TypeScript types: Generated ✅"
echo ""
echo "Next steps:"
echo "  1. Run 'npm start' to start the development server"
echo "  2. Test authentication and features"
echo "  3. See SUPABASE_SETUP.md for advanced configuration"
echo ""
echo "🚀 Happy coding!"
