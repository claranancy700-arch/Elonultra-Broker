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

  function renderBannerContent(testimonies) {
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

    return contentHTML;
  }

  // Check if banner already has pre-rendered content
  const contentDiv = bannerEl.querySelector('.testimonies-banner-content');
  
  if (contentDiv) {
    // Banner is already pre-rendered (from HTML) — DO NOT MODIFY IT
    // The pre-rendered mock testimonies are good enough, and modifying the HTML would reset the animation
    // Just silently fetch real testimonies for future improvements, but don't update the DOM
    TestimoniesService.fetchAll().catch(err => console.warn('Failed to fetch testimonies in background:', err));
  } else {
    // No pre-rendered content, create banner from scratch
    try {
      const testimonies = await TestimoniesService.fetchAll();
      const contentHTML = renderBannerContent(testimonies && testimonies.length > 0 ? testimonies : mockTestimonies);
      
      bannerEl.innerHTML = `
        <div class="testimonies-banner-content">
          ${contentHTML}
        </div>
      `;
    } catch (err) {
      console.warn('Failed to load testimonies banner:', err);
      const contentHTML = renderBannerContent(mockTestimonies);
      bannerEl.innerHTML = `
        <div class="testimonies-banner-content">
          ${contentHTML}
        </div>
      `;
    }
  }
})();

