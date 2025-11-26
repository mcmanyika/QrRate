# Android SDK Setup Guide

## Quick Fix: Use Expo Development Server (No SDK Required)

For development, you don't need Android SDK. Just run:

```bash
cd apps/mobile
npm start
```

Then scan the QR code with Expo Go app on your phone.

## If You Need Local Android Builds

### 1. Install Android Studio

Download and install Android Studio from: https://developer.android.com/studio

### 2. Install Android SDK

1. Open Android Studio
2. Go to **Tools > SDK Manager**
3. Install:
   - Android SDK Platform-Tools
   - Android SDK Build-Tools
   - At least one Android SDK Platform (API 33 or higher recommended)

### 3. Set Environment Variables

Add to your `~/.zshrc` (or `~/.bash_profile`):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then reload:
```bash
source ~/.zshrc
```

### 4. Verify Installation

```bash
echo $ANDROID_HOME
adb version
```

## Alternative: Use EAS Build (Cloud-Based, No SDK Needed)

For production builds, use EAS Build which runs in the cloud:

```bash
cd apps/mobile
eas build --platform android --profile production
```

This doesn't require local Android SDK installation.

