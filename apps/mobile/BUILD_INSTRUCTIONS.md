# Building AAB for Production

## Prerequisites

1. **Install EAS CLI globally:**

   ```bash
   npm install -g eas-cli
   ```

2. **Login to your Expo account:**

   ```bash
   eas login
   ```

3. **Set up environment variables in EAS:**

   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value your_supabase_url
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your_supabase_anon_key
   ```

   Or set them via EAS dashboard at https://expo.dev

## Build Steps

1. **Navigate to the mobile app directory:**

   ```bash
   cd apps/mobile
   ```

2. **Configure EAS Build (if not already done):**

   ```bash
   eas build:configure
   ```

3. **Build the AAB for production:**

   ```bash
   eas build --platform android --profile production
   ```

4. **Monitor the build:**

   - The build will run in the cloud (takes 15-30 minutes)
   - You can check status with: `eas build:list`
   - Or view in the EAS dashboard: https://expo.dev

5. **Download the AAB:**
   - Once complete, EAS will provide a download link
   - Or download from the EAS dashboard
   - The AAB file is ready for Google Play Store submission

## Notes

- First build may take longer as EAS sets up credentials
- EAS automatically handles Android signing keys
- AAB file size is typically 20-50MB
- Make sure your Supabase credentials are correct before building

## Local Development

For local development, create a `.env` file in `apps/mobile/`:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Note: `.env` files are gitignored. Use EAS secrets for production builds.
