// Central application configuration.
export const CONFIG = {
  projectName: 'SeasonForge',
  version: '1.0.0',
  data: {
    seasonsPath: './data/seasons.json'
  },
  app: {
    defaultLocale: 'en',
    defaultTheme: 'dark',
    autoLoad: true
  },
  updates: {
    enabled: true,
    intervalMinutes: 60,
    source: 'local'
  }
};
