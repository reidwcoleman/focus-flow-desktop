#!/bin/bash
# Run the Canvas persistence migration

echo "Running Canvas persistence migration..."

# Read the migration SQL
MIGRATION_SQL=$(cat supabase/migrations/20251214_add_canvas_persistence.sql)

# Execute via Supabase CLI
supabase db execute --sql "$MIGRATION_SQL" --project-ref uhlgppoylqeiirpfhhqm

echo "Migration complete!"
