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

  try {
    // Fetch testimonies
    const testimonies = await TestimoniesService.fetchAll();
    if (!testimonies || testimonies.length === 0) {
      bannerEl.style.display = 'none';
      return;
    }

    // Create scrolling content with duplicated items for seamless loop
    // We duplicate testimonies to create infinite scrolling effect
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
      // Calculate the natural width of one set of testimonies
      const singleSetWidth = content.offsetWidth / 2;
      
      content.addEventListener('animationiteration', () => {
        // Reset position for seamless looping
        content.style.animation = 'none';
        setTimeout(() => {
          content.style.animation = 'scroll-left 60s linear infinite';
        }, 10);
      });
    }

  } catch (err) {
    console.warn('Failed to load testimonies banner:', err);
    bannerEl.style.display = 'none';
  }
})();
