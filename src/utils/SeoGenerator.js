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
      canonicalUrl: inputCanonicalUrl = 'https://seasonforge.online',
      baseUrl = 'https://seasonforge.online',
      startDate = '',
      endDate = '',
      developer = '',
      faq = [],
      lang = 'en'
    } = params;

    // Ensure strict trailing-slash canonical URL
    let canonicalUrl = inputCanonicalUrl || baseUrl;
    if (!canonicalUrl.endsWith('/')) {
      canonicalUrl += '/';
    }

    const ogLocale = lang === 'ru' ? 'ru_RU' : 'en_US';
    let title = '';
    let metaDescription = description || '';

    if (type === 'season') {
      title = lang === 'ru'
        ? `${seasonName} — ${gameName} | Дата начала, отсчет и подробности | SeasonForge`
        : `${seasonName} — ${gameName} | Next League Start & Release Date Countdown | SeasonForge`;
      if (!metaDescription) {
        metaDescription = lang === 'ru'
          ? `Полная информация о сезоне ${seasonName} в ${gameName}: обратный отсчет, дата начала, механики и хронология.`
          : `Full details on ${seasonName} for ${gameName}: live countdown timer, start date, mechanics, and complete season timeline.`;
      }
    } else if (type === 'game') {
      title = lang === 'ru'
        ? `${gameName} — Дата начала новой лиги и таймер обратного отсчета | SeasonForge`
        : `${gameName} — Next League Start & Release Date Countdown | SeasonForge`;
      if (!metaDescription) {
        metaDescription = lang === 'ru'
          ? `Следите за датами старта новых лиг и сезонов ${gameName}. Живой отсчет времени (countdown timer), хронология сезонов и полезные ссылки.`
          : `Track current and upcoming ${gameName} season release dates. Live countdown timer, next league start date, history timeline, and guides.`;
      }
    } else {
      title = lang === 'ru'
        ? `SeasonForge — Мониторинг Сезонов и Дат Старта Лиг ARPG Игр`
        : `SeasonForge — ARPG Season & League Tracker | Live Release Countdowns`;
      if (!metaDescription) {
        metaDescription = lang === 'ru'
          ? `Единый трекер сезонов и лиг ARPG игр: Path of Exile 2, Path of Exile, Diablo IV, Last Epoch и Torchlight Infinite. Даты запуска и таймеры.`
          : `Comprehensive season tracker & live release date countdowns for ARPGs: Path of Exile 2, Path of Exile, Diablo IV, Last Epoch, Torchlight Infinite.`;
      }
    }

    const todayISO = new Date().toISOString().split('T')[0];

    // Schema.org Graph
    const breadcrumbList = {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/` }
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

    // Add FAQPage Schema if FAQ items exist
    if (Array.isArray(faq) && faq.length > 0) {
      const faqEntities = faq.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }));

      graph.push({
        "@type": "FAQPage",
        "mainEntity": faqEntities
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
      ogLocale,
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

    const ogLocaleStr = lang === 'ru' ? 'ru_RU' : 'en_US';
    const ogLocaleMeta = document.querySelector('meta[property="og:locale"]');
    if (ogLocaleMeta) ogLocaleMeta.setAttribute('content', ogLocaleStr);

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
