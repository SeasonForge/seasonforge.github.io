import { BaseAdapter } from './BaseAdapter.js';

export class StaticAdapter extends BaseAdapter {
  constructor() {
    super('static');
  }

  async fetchAndNormalize(gameConfig) {
    console.log(`[Static Adapter] Returning static data for ${gameConfig.name}`);
    
    const staticData = gameConfig.staticData || {};
    
    return {
      id: gameConfig.id,
      name: gameConfig.name,
      developer: staticData.developer || 'Unknown',
      logo: staticData.logo || '',
      color: staticData.color || '#4b5563',
      website: staticData.website || '#',
      latestNews: {
        id: 'static-config',
        title: 'Официальный анонс Path of Exile 2',
        url: staticData.website || 'https://www.pathofexile.com/',
        publishDate: staticData.currentSeason?.startDate || new Date().toISOString(),
        source: 'Grinding Gear Games'
      },
      status: {
        code: staticData.status?.code || 'in-development',
        label: staticData.status?.label || 'In Development',
        updatedAt: new Date().toISOString()
      },
      currentSeason: {
        name: staticData.currentSeason?.name || 'TBA',
        startDate: staticData.currentSeason?.startDate || '',
        endDate: staticData.currentSeason?.endDate || '',
        isActive: staticData.currentSeason?.isActive || false,
        verification: staticData.currentSeason?.verification || 'official',
        sourceUrl: staticData.currentSeason?.sourceUrl || ''
      },
      nextSeason: {
        name: staticData.nextSeason?.name || 'TBA',
        startDate: staticData.nextSeason?.startDate || '',
        endDate: staticData.nextSeason?.endDate || '',
        isActive: false,
        verification: staticData.nextSeason?.verification || 'official',
        sourceUrl: staticData.nextSeason?.sourceUrl || ''
      },
      features: staticData.features || [],
      links: staticData.links || {
        official: staticData.website || '#',
        wiki: '',
        community: ''
      },
      metadata: staticData.metadata || {
        region: 'Global',
        platforms: ['PC'],
        tags: ['ARPG']
      }
    };
  }
}
