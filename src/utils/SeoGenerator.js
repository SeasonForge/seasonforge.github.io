/**
 * Unified SEO & Schema.org Metadata Generator for SeasonForge.
 * Works in both Node.js (SSG build) and Browser environments.
 */

export class SeoGenerator {
  /**
   * Generate complete SEO metadata package for a page or season.
   * @param {Object} params
   * @param {'home'|'game'|'season'} params.type
   * @param {string} params.gameName
   * @param {string} [params.seasonName]
   * @param {string} [params.description]
   * @param {string} params.canonicalUrl
   * @param {string} [params.baseUrl='https://seasonforge.online']
   * @param {string} [params.startDate]
   * @param {string} [params.endDate]
   * @param {string} [params.developer]
   * @param {string} [params.lang='en']
   * @returns {Object} SEO metadata containing title, description, schemaJsonLd, etc.
   */
  static generateSeoData(params) {
    const {
      type = 'game',
      gameName = 'ARPG',
      seasonName = '',
      description = '',
      canonicalUrl = 'https://seasonforge.online',
      baseUrl = 'https://seasonforge.online',
      startDate = '',
      endDate = '',
      developer = '',
      lang = 'en'
    } = params;

    let title = '';
    let metaDescription = description || '';

    if (type === 'season') {
      title = `${seasonName} — ${gameName} | SeasonForge`;
      if (!metaDescription) {
        metaDescription = lang === 'ru'
          ? `Информация о сезоне ${seasonName} в ${gameName}: дата начала, дата окончания, продолжительность и хронология.`
          : `Full details on ${seasonName} for ${gameName}: start date, end date, duration, and complete season timeline.`;
      }
    } else if (type === 'game') {
      title = `${gameName} — ${lang === 'ru' ? 'Мониторинг Сезонов' : 'ARPG Season Tracker'} | SeasonForge`;
      if (!metaDescription) {
        metaDescription = lang === 'ru'
          ? `Следите за текущими и будущими сезонами ${gameName}. Живой отсчет времени, хронология и архивы.`
          : `Track current and upcoming seasons for ${gameName}. Live countdown timers, history timeline, and links.`;
      }
    } else {
      title = `SeasonForge — ${lang === 'ru' ? 'Мониторинг Сезонов ARPG Игр' : 'ARPG Season & League Tracker'}`;
      if (!metaDescription) {
        metaDescription = lang === 'ru'
          ? `Единый трекер сезонов и лиг ARPG игр: Path of Exile, Diablo IV, Last Epoch и Torchlight Infinite.`
          : `Comprehensive season tracker for ARPGs: Path of Exile, Diablo IV, Last Epoch, and Torchlight Infinite.`;
      }
    }

    const todayISO = new Date().toISOString().split('T')[0];

    // Schema.org Graph
    const breadcrumbList = {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl }
      ]
    };

    if (type === 'game' || type === 'season') {
      breadcrumbList.itemListElement.push({
        "@type": "ListItem",
        "position": 2,
        "name": gameName,
        "item": `${baseUrl}/games/${gameName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`
      });
    }

    if (type === 'season') {
      breadcrumbList.itemListElement.push({
        "@type": "ListItem",
        "position": 3,
        "name": seasonName,
        "item": canonicalUrl
      });
    }

    const graph = [breadcrumbList];

    if (type === 'season') {
      graph.push({
        "@type": "Event",
        "name": `${gameName} - ${seasonName}`,
        "startDate": startDate || todayISO,
        ...(endDate ? { "endDate": endDate } : {}),
        "dateModified": todayISO,
        "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
        "location": {
          "@type": "VirtualLocation",
          "url": canonicalUrl
        },
        "description": metaDescription,
        "organizer": {
          "@type": "Organization",
          "name": developer || "Developer"
        }
      });
    }

    const schemaJsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": graph
    }, null, 2);

    return {
      title,
      description: metaDescription,
      canonicalUrl,
      ogTitle: title,
      ogDesc: metaDescription,
      twitterTitle: title,
      twitterDesc: metaDescription,
      schemaJsonLd
    };
  }

  /**
   * Client-side DOM updater for meta tags.
   */
  static applyToDOM({ title, description, lang = 'en' }) {
    if (typeof document === 'undefined') return;

    if (title) document.title = title;
    if (lang) document.documentElement.lang = lang;

    if (description) {
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) descMeta.setAttribute('content', description);

      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', description);

      const twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (twitterDesc) twitterDesc.setAttribute('content', description);
    }

    if (title) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', title);

      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) twitterTitle.setAttribute('content', title);
    }
  }
}
