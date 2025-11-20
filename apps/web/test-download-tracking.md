# Testing Download Tracking

## Steps to Debug

1. **Check Browser Console**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Click a download button
   - Look for error messages

2. **Verify Environment Variables**
   - Create `.env.local` file in `apps/web/` directory
   - Add: `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here`
   - Restart the dev server: `npm run dev`

3. **Verify Database Table Exists**
   - Go to Supabase Dashboard → Table Editor
   - Check if `download` table exists
   - If not, run the SQL from `supabase/download_tracking_setup.sql`

4. **Check RLS Policies**
   - Go to Supabase Dashboard → Authentication → Policies
   - Verify `download` table has policy `download_insert_anon` that allows anonymous inserts

5. **Test Direct Insert**
   - In Supabase Dashboard → SQL Editor, try:
   ```sql
   INSERT INTO download (platform, user_agent) 
   VALUES ('android', 'test');
   ```
   - If this works, the table and RLS are correct

## Common Issues

- **Missing ANON_KEY**: Check `.env.local` file exists and has the key
- **RLS Policy Missing**: Run the SQL setup script
- **Table Doesn't Exist**: Run the migration SQL
- **CORS Issues**: Shouldn't happen with client-side, but check browser console

