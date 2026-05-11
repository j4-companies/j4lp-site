# J4 Legacy Properties — Supabase Setup Commands
# Run these in Terminal from your j4lp-site folder
# Do them in order, one at a time

# ── STEP 1: Install Supabase CLI ──
brew install supabase/tap/supabase

# ── STEP 2: Login to Supabase ──
supabase login
# This opens a browser — click Allow

# ── STEP 3: Link your project ──
supabase link --project-ref rqnvfruyhkkmsqvzqdli
# It will ask for your database password — enter it now

# ── STEP 4: Run the schema SQL ──
# Go to Supabase dashboard → SQL Editor → paste contents of schema.sql → Run
# OR run via CLI:
supabase db push

# ── STEP 5: Deploy the edge function ──
supabase functions deploy lead-capture --no-verify-jwt

# ── STEP 6: Set environment variables on the edge function ──
supabase secrets set SUPABASE_URL=https://rqnvfruyhkkmsqvzqdli.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxbnZmcnV5aGtrbXNxdnpxZGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0ODM3NSwiZXhwIjoyMDk0MDI0Mzc1fQ.T0ntiWmDm_Bc4YTWMf9PDAjybv-NxmGIYNY9bHtONSA

# ── STEP 7: Get your anon key ──
# Go to Supabase dashboard → Project Settings → API
# Copy the "anon / public" key
# Open js/forms.js and replace REPLACE_WITH_YOUR_ANON_KEY with it

# ── STEP 8: Test the edge function ──
curl -X POST https://rqnvfruyhkkmsqvzqdli.supabase.co/functions/v1/lead-capture \
  -H "Content-Type: application/json" \
  -d '{"form_type":"test","name":"Test Lead","email":"stephanie@j4lp.com","phone":"9790000000","message":"This is a test submission"}'
# You should get: {"success":true}
# Check Supabase Table Editor → leads table for the row
# Check GHL → Contacts for the new lead
