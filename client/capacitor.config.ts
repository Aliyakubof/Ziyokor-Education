import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ziyokor.education',
  appName: 'Ziyokor Education',
  webDir: 'dist',
  server: {
    allowNavigation: ['64.226.94.154', 'zeducation.uz', '*.zeducation.uz'],
    cleartext: true
  }
};

export default config;
