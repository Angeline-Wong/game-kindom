import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zichen.chronicles',
  appName: '紫宸纪事',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0d0805',
    allowMixedContent: false,
  },
};

export default config;