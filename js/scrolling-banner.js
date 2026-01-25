/* global TestimoniesService */
/**
 * Scrolling Testimonies Banner — Shows rotating testimonies in a horizontal scrolling banner
 * Usage: Add <div id="testimonies-banner" class="testimonies-banner"></div> before main content
 *        Add <script src="/js/scrolling-banner.js"></script> at end of page
 */

(async function() {
  // Only load if testimonies service is available
  if (typeof TestimoniesService === 'undefined') {
    console.warn('TestimoniesService not loaded, skipping testimonies banner');
    return;
  }

  const bannerEl = document.getElementById('testimonies-banner');
  if (!bannerEl) {
    console.warn('No testimonies-banner element found');
    return;
  }

  // Mock testimonies to show immediately
  const mockTestimonies = [
    {
      client_name: 'John Smith',
      content: 'The trading service has been honest, transparent, and consistently efficient. Their support agents guided me clearly through every step.',
      rating: 5
    },
    {
      client_name: 'Sarah Johnson',
      content: 'Best crypto trading platform I have used. The customer support is exceptional and the real-time market data is invaluable.',
      rating: 5
    },
    {
      client_name: 'Michael Chen',
      content: 'The real-time data and low fees make this my go-to platform. Professional-grade tools at an unbeatable price point.',
      rating: 5
    }
  ];

  function renderBanner(testimonies) {
    if (!testimonies || testimonies.length === 0) {
      testimonies = mockTestimonies;
    }

    // Create scrolling content with duplicated items for seamless loop
    const allItems = [...testimonies, ...testimonies];

    const contentHTML = allItems.map(t => `
      <div class="testimonies-banner-item">
        <strong>${t.client_name}</strong>
        <span class="testimonies-banner-item-text">"${t.content.substring(0, 100)}${t.content.length > 100 ? '...' : ''}"</span>
        ${t.rating ? `<span style="color: #ffc107;">${'⭐'.repeat(t.rating)}</span>` : ''}
      </div>
    `).join('');

    bannerEl.innerHTML = `
      <div class="testimonies-banner-content">
        ${contentHTML}
      </div>
    `;

    // Reset animation when it ends to create seamless loop
    const content = bannerEl.querySelector('.testimonies-banner-content');
    if (content) {
      content.addEventListener('animationiteration', () => {
        content.style.animation = 'none';
        setTimeout(() => {
          content.style.animation = 'scroll-left 60s linear infinite';
        }, 10);
      });
    }
  }

  try {
    // Show mock testimonies IMMEDIATELY
    renderBanner(mockTestimonies);

    // Fetch real testimonies in background
    const testimonies = await TestimoniesService.fetchAll();
    if (testimonies && testimonies.length > 0) {
      renderBanner(testimonies);
    }

  } catch (err) {
    console.warn('Failed to load testimonies banner:', err);
    // Keep showing mock testimonies even if fetch fails
    renderBanner(mockTestimonies);
  }
})();

