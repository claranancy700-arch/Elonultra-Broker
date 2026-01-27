/* global TestimoniesService */
/**
 * Scrolling Testimonies Banner — Shows rotating testimonies in a horizontal scrolling banner
 * Usage: Add <div id="testimonies-banner" class="testimonies-banner"></div> before main content
 *        Add <script src="/js/scrolling-banner.js"></script> at end of page
 */

(async function () {
  if (typeof TestimoniesService === 'undefined') {
    console.warn('TestimoniesService not loaded, skipping testimonies banner');
    return;
  }

  const bannerEl = document.getElementById('testimonies-banner');
  if (!bannerEl) {
    console.warn('No testimonies-banner element found');
    return;
  }

  // Keep movement consistent across different banner widths
  const SPEED_PX_PER_SEC = 60;
  const MIN_DURATION_S = 18;
  const MAX_DURATION_S = 80;

  // Mock testimonies to show immediately
  const mockTestimonies = [
    {
      client_name: 'John Smith',
      content:
        'The trading service has been honest, transparent, and consistently efficient. Their support agents guided me clearly through every step.',
      rating: 5,
    },
    {
      client_name: 'Sarah Johnson',
      content:
        'Best crypto trading platform I have used. The customer support is exceptional and the real-time market data is invaluable.',
      rating: 5,
    },
    {
      client_name: 'Michael Chen',
      content:
        'The real-time data and low fees make this my go-to platform. Professional-grade tools at an unbeatable price point.',
      rating: 5,
    },
  ];

  function renderBannerItems(testimonies) {
    const items = (testimonies && testimonies.length > 0 ? testimonies : mockTestimonies).slice();
    const loopItems = [...items, ...items];

    return loopItems
      .map(
        (t) => `
      <div class="testimonies-banner-item">
        <strong>${t.client_name}</strong>
        <span class="testimonies-banner-item-text">"${t.content.substring(0, 100)}${
          t.content.length > 100 ? '...' : ''
        }"</span>
        ${t.rating ? `<span style="color: #ffc107;">${'⭐'.repeat(t.rating)}</span>` : ''}
      </div>
    `
      )
      .join('');
  }

  function applyScrollDuration(contentDiv) {
    if (!contentDiv) return;

    // Wait for layout so scrollWidth is accurate.
    requestAnimationFrame(() => {
      const fullWidth = contentDiv.scrollWidth;
      if (!fullWidth) return;

      // We animate from 0% to -50%, so distance is half the loop width.
      const distancePx = fullWidth / 2;
      const raw = distancePx / SPEED_PX_PER_SEC;
      const duration = Math.max(MIN_DURATION_S, Math.min(MAX_DURATION_S, raw));

      contentDiv.style.animationDuration = `${duration.toFixed(1)}s`;
    });
  }

  // Ensure the banner shows immediately (even if the API is slow)
  let contentDiv = bannerEl.querySelector('.testimonies-banner-content');
  if (!contentDiv) {
    bannerEl.innerHTML = `
      <div class="testimonies-banner-content">
        ${renderBannerItems(mockTestimonies)}
      </div>
    `;
    contentDiv = bannerEl.querySelector('.testimonies-banner-content');
  }

  applyScrollDuration(contentDiv);
  window.addEventListener('resize', () => applyScrollDuration(contentDiv));

  // Load real testimonies in background (non-blocking)
  try {
    const testimonies = await TestimoniesService.fetchAll();
    if (testimonies && testimonies.length > 0 && contentDiv) {
      // Update children only (keeps the same animated element so the animation doesn't restart).
      contentDiv.innerHTML = renderBannerItems(testimonies);
      applyScrollDuration(contentDiv);
    }
  } catch (err) {
    console.warn('Failed to load testimonies banner:', err);
  }
})();
