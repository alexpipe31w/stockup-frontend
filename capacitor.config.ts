import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stockup.mensajes',
  appName: 'Stockup Mensajes',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
};

export default config;
