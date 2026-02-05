/* global TestimoniesService */
/**
 * Floating Testimonies Widget — Shows rotating testimonies on any page
 * Usage: Add <script src="/js/floating-testimonies.js"></script> to any page
 */

(async function() {
  // Only load if testimonies service is available
  if (typeof TestimoniesService === 'undefined') {
    console.warn('TestimoniesService not loaded, skipping floating testimonies widget');
    return;
  }

  let testimonies = [];
  let currentIndex = 0;
  const ROTATE_INTERVAL = 15000; // Rotate every 15 seconds (was 8 seconds)

  // Create floating widget HTML
  const createWidget = () => {
    const widget = document.createElement('div');
    widget.id = 'floating-testimonies-widget';
    widget.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      max-height: 400px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      z-index: 999;
      overflow: hidden;
      font-family: inherit;
      animation: slideIn 0.3s ease-out;
    `;

    widget.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, var(--primary, #0066ff), var(--accent, #ff6600)); color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 600; font-size: 14px;">💬 Client Testimonies</div>
          <button id="close-testimonies" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">×</button>
        </div>

        <!-- Content -->
        <div id="testimony-content" style="flex: 1; padding: 20px; overflow: auto;">
          <div style="text-align: center; color: #999;">Loading testimonies...</div>
        </div>

        <!-- Navigation -->
        <div style="display: flex; justify-content: center; align-items: center; gap: 12px; padding: 12px; border-top: 1px solid #eee; background: #fafafa;">
          <button id="prev-testimony" class="testimony-nav-btn" style="background: var(--primary, #0066ff); color: white; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px;">←</button>
          <div id="testimony-counter" style="font-size: 12px; color: #666; min-width: 50px; text-align: center;">1/10</div>
          <button id="next-testimony" class="testimony-nav-btn" style="background: var(--primary, #0066ff); color: white; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px;">→</button>
        </div>

        <!-- Auto-rotate indicator -->
        <div style="height: 3px; background: #eee; overflow: hidden;">
          <div id="progress-bar" style="height: 100%; background: var(--accent, #ff6600); width: 0%; transition: width 0.1s linear;"></div>
        </div>
      </div>

      <style>
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(20px);
          }
        }

        .testimony-nav-btn:hover {
          opacity: 0.8;
          transform: scale(1.05);
        }

        .testimony-nav-btn:active {
          transform: scale(0.95);
        }

        /* Hide testimonies on mobile (<900px) */
        @media (max-width: 900px) {
          #floating-testimonies-widget {
            display: none !important;
          }
        }
      </style>
    `;

    return widget;
  };

  const renderTestimony = (index) => {
    if (!testimonies || testimonies.length === 0) return;

    const t = testimonies[index % testimonies.length];
    const content = document.getElementById('testimony-content');
    
    if (!content) return;

    content.innerHTML = `
      <div style="animation: fadeIn 0.3s ease-out;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          ${t.client_image 
            ? `<img src="${t.client_image}" alt="${t.client_name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">` 
            : `<div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--primary, #0066ff), var(--accent, #ff6600)); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">${t.client_name.charAt(0)}</div>`
          }
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 14px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.client_name}</div>
            ${t.title ? `<div style="font-size: 12px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.title}</div>` : ''}
          </div>
        </div>
        ${t.rating ? `<div style="color: #ffc107; font-size: 14px; margin-bottom: 12px;">${'⭐'.repeat(t.rating)}</div>` : ''}
        <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.6; font-style: italic;">"${t.content.substring(0, 280)}${t.content.length > 280 ? '...' : ''}"</p>
      </div>

      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      </style>
    `;

    // Update counter
    const counter = document.getElementById('testimony-counter');
    if (counter) counter.textContent = `${index + 1}/${testimonies.length}`;
  };

  const updateProgressBar = () => {
    const progressBar = document.getElementById('progress-bar');
    if (!progressBar) return;

    let progress = 0;
    const increment = 100 / (ROTATE_INTERVAL / 50); // Update every 50ms

    const timer = setInterval(() => {
      progress += increment;
      progressBar.style.width = progress + '%';
      
      if (progress >= 100) {
        clearInterval(timer);
      }
    }, 50);

    return timer;
  };

  const showTestimony = (index) => {
    currentIndex = index;
    renderTestimony(index);
  };

  const nextTestimony = () => {
    currentIndex = (currentIndex + 1) % testimonies.length;
    renderTestimony(currentIndex);
    resetAutoRotate();
  };

  const prevTestimony = () => {
    currentIndex = (currentIndex - 1 + testimonies.length) % testimonies.length;
    renderTestimony(currentIndex);
    resetAutoRotate();
  };

  let autoRotateTimer;
  let progressTimer;

  const resetAutoRotate = () => {
    clearInterval(autoRotateTimer);
    clearInterval(progressTimer);
    progressTimer = updateProgressBar();
    autoRotateTimer = setTimeout(() => {
      currentIndex = (currentIndex + 1) % testimonies.length;
      renderTestimony(currentIndex);
      resetAutoRotate();
    }, ROTATE_INTERVAL);
  };

  const closeWidget = () => {
    const widget = document.getElementById('floating-testimonies-widget');
    if (widget) {
      widget.style.animation = 'slideOut 0.3s ease-out forwards';
      setTimeout(() => widget.remove(), 300);
    }
    clearInterval(autoRotateTimer);
    clearInterval(progressTimer);
  };

  // Initialize
  try {
    // Mock testimonies to show immediately
    const mockTestimonies = [
      {
        client_name: 'John Smith',
        title: 'CEO, Tech Ventures',
        content: 'ELON ULTRA ELONS has completely transformed my crypto trading experience. The platform is intuitive, secure, and I have increased my portfolio by 85% since joining.',
        rating: 5
      },
      {
        client_name: 'Sarah Johnson',
        title: 'Entrepreneur',
        content: 'Best crypto trading platform I have used. The customer support is exceptional and the real-time market data is invaluable. Five stars!',
        rating: 5
      },
      {
        client_name: 'Michael Chen',
        title: 'Hedge Fund Manager',
        content: 'The real-time data and low fees make ELON ULTRA ELONS my go-to platform. Professional-grade tools at an unbeatable price point.',
        rating: 5
      }
    ];

    // Show mock testimonies IMMEDIATELY
    testimonies = mockTestimonies;
    const widget = createWidget();
    document.body.appendChild(widget);

    // Add event listeners
    document.getElementById('close-testimonies')?.addEventListener('click', closeWidget);
    document.getElementById('prev-testimony')?.addEventListener('click', prevTestimony);
    document.getElementById('next-testimony')?.addEventListener('click', nextTestimony);

    // Show first testimony and start auto-rotate
    showTestimony(0);
    resetAutoRotate();

    console.log('[Floating Testimonies] Widget loaded with mock testimonies');

    // Load real testimonies in background (non-blocking)
    const realTestimonies = await TestimoniesService.fetchAll();
    if (realTestimonies && realTestimonies.length > 0) {
      testimonies = realTestimonies;
      console.log('[Floating Testimonies] Updated with real testimonies:', testimonies.length);
      // Update display with real testimonies
      showTestimony(currentIndex);
    }

  } catch (err) {
    console.error('Failed to load floating testimonies widget:', err);
  }
})();
