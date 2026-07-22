/**
 * Updates page title, html lang attribute, and meta tags for SEO/OpenGraph.
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {string} [params.lang='en']
 */
export function setMetaTags({ title, description, lang = 'en' }) {
  if (title) {
    document.title = title;
  }
  
  document.documentElement.lang = lang;

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
