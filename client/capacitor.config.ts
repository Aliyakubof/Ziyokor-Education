import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ziyokor.education',
  appName: 'Ziyokor Education',
  webDir: 'dist',
  server: {
    allowNavigation: ['64.226.94.154'],
    cleartext: true
  }
};

export default config;
