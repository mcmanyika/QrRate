# Mobile App Setup Guide

## Network Configuration

The mobile app needs to connect to your web server API. Since `localhost:3000` won't work on a real device, you need to configure the API URL.

### Option 1: Use Your Local IP Address (Recommended for Development)

1. Find your computer's local IP address:
   - **Mac/Linux**: Run `ifconfig | grep "inet "` or `ipconfig getifaddr en0`
   - **Windows**: Run `ipconfig` and look for IPv4 Address

2. Update your mobile app's `.env` file:
   ```
   EXPO_PUBLIC_APP_URL=http://YOUR_LOCAL_IP:3000
   ```
   Example: `EXPO_PUBLIC_APP_URL=http://192.168.1.100:3000`

3. Make sure your web server is running and accessible:
   ```bash
   cd apps/web
   npm run dev
   ```

4. Ensure your phone and computer are on the same Wi-Fi network

### Option 2: Use ngrok (For Testing with External Devices)

1. Install ngrok: https://ngrok.com/download

2. Start your web server:
   ```bash
   cd apps/web
   npm run dev
   ```

3. In another terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```

4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

5. Update your mobile app's `.env` file:
   ```
   EXPO_PUBLIC_APP_URL=https://abc123.ngrok.io
   ```

6. Restart your Expo app

### Option 3: Deploy to Production

Deploy your web app to a hosting service (Vercel, Netlify, etc.) and use that URL:

```
EXPO_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Troubleshooting

### "Network request failed" Error

1. **Check API URL**: Verify `EXPO_PUBLIC_APP_URL` is set correctly in `.env`
2. **Check Web Server**: Make sure your web server is running on port 3000
3. **Check Network**: Ensure phone and computer are on the same network
4. **Check Firewall**: Your computer's firewall might be blocking connections
5. **Check Console**: Look at the Expo/React Native console for detailed error messages

### Testing API Connection

You can test if the API is accessible by opening this URL in your phone's browser:
```
http://YOUR_IP:3000/api/business/by-code?code=TEST
```

If you see a JSON response (even an error), the API is reachable.

## Environment Variables

Create or update `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_APP_URL=http://YOUR_IP:3000
```

After updating `.env`, restart your Expo development server.

