/**
 * Escapes a value for safe insertion into an HTML attribute.
 * Prevents XSS through data-driven URL attributes (href, src, etc.).
 * @param {*} value
 * @returns {string}
 */
export function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escapes a value for safe insertion as HTML text content.
 * @param {*} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Detects whether hardware acceleration is disabled (software-only rasterization/SwiftShader)
 * and attaches a lightweight class to <html> to gracefully fall back from heavy real-time blurs.
 */
export function initPerformanceDetection() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      document.documentElement.classList.add('sf-perf-low');
      return;
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
      if (
        renderer.includes('swiftshader') ||
        renderer.includes('llvmpipe') ||
        renderer.includes('softpipe') ||
        renderer.includes('basic render') ||
        renderer.includes('software')
      ) {
        document.documentElement.classList.add('sf-perf-low');
      }
    }
  } catch (e) {
    // Fail-safe
  }
}

