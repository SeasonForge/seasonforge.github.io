/**
 * HeroParallax.js
 * Interactive layered background of the hooded hero character.
 * Tracks mouse movement with smooth Lerp interpolation for eyes and head micro-movements.
 */

export function initHeroParallax() {
  const container = document.getElementById('hero-parallax-bg');
  if (!container) return;

  const body = container.querySelector('.hero-parallax__body');
  const head = container.querySelector('.hero-parallax__head');
  const eyes = container.querySelector('.hero-parallax__eyes');

  if (!head || !eyes) return;

  // Reveal background smoothly once layers and scripts are ready
  requestAnimationFrame(() => {
    container.classList.add('hero-parallax-bg--ready');
  });

  // Target normalized coordinates (-1 to 1)
  let targetX = 0;
  let targetY = 0;

  // Current interpolated coordinates
  let currentX = 0;
  let currentY = 0;

  // Lerp factor (smooth responsive micro-parallax)
  const LERP_FACTOR = 0.048;

  let isTicking = false;

  // Check touch or prefers-reduced-motion vs fine mouse pointer
  const hasFinePointer = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!hasFinePointer || prefersReducedMotion) {
    // Pure GPU-composited CSS breathing animation, zero JS rAF overhead
    container.classList.add('hero-parallax-bg--breathing');
    return;
  }

  // Mousemove listener for fine pointers
  window.addEventListener('mousemove', (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;

    if (!isTicking) {
      isTicking = true;
      requestAnimationFrame(updateParallax);
    }
  }, { passive: true });

  function updateParallax() {
    currentX += (targetX - currentX) * LERP_FACTOR;
    currentY += (targetY - currentY) * LERP_FACTOR;

    // Harmonious expressive 3D motion: connected chain without neck break
    const bodyX = currentX * 3.0;
    const bodyY = currentY * 1.8;

    const headX = currentX * 6.0;
    const headY = currentY * 3.6;

    const eyesX = currentX * 8.5;
    const eyesY = currentY * 5.0;

    if (body) {
      body.style.transform = `translate3d(${bodyX.toFixed(2)}px, ${bodyY.toFixed(2)}px, 0)`;
    }
    head.style.transform = `translate3d(${headX.toFixed(2)}px, ${headY.toFixed(2)}px, 0)`;
    eyes.style.transform = `translate3d(${eyesX.toFixed(2)}px, ${eyesY.toFixed(2)}px, 0)`;

    const diff = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
    if (diff > 0.001) {
      requestAnimationFrame(updateParallax);
    } else {
      isTicking = false;
    }
  }

  // Handle visibility state change to pause when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isTicking = false;
    }
  });
}
