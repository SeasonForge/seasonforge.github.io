/**
 * Safe client-side Google Analytics 4 (gtag) helper.
 * @param {string} eventName
 * @param {Record<string, any>} [params]
 */
export function trackEvent(eventName, params = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  } catch (err) {
    // Fail silently without breaking user experience
  }
}
