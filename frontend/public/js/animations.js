(function(window){
  // Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe cards and tables
  document.addEventListener('DOMContentLoaded', () => {
    // Stagger animations for cards
    document.querySelectorAll('.card').forEach((card, i) => {
      card.style.animation = `fadeInUp 0.6s ease-out ${i * 0.1}s both`;
      observer.observe(card);
    });

    // Animate table rows on hover
    document.querySelectorAll('tbody tr').forEach(row => {
      row.addEventListener('mouseenter', () => {
        row.style.animation = 'none';
        setTimeout(() => {
          row.style.animation = '';
        }, 10);
      });
    });

    // Smooth number counting for stat cards
    document.querySelectorAll('.card-value').forEach(el => {
      if(el.textContent.includes('$')){
        animateValue(el);
      }
    });

    // Active sidebar link based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'landing.html';
    document.querySelectorAll('.sidebar-link').forEach(link => {
      if(link.getAttribute('href') === currentPage || (currentPage === '' && link.getAttribute('href') === 'landing.html')){
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Form input animations
    document.querySelectorAll('input, textarea, select').forEach(input => {
      input.addEventListener('focus', function(){
        this.parentElement.style.transform = 'scale(1.01)';
      });
      input.addEventListener('blur', function(){
        this.parentElement.style.transform = 'scale(1)';
      });
    });

    // Button ripple effect
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', function(e){
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.position = 'absolute';
        ripple.style.background = 'rgba(255,255,255,0.6)';
        ripple.style.borderRadius = '50%';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'pulse 0.6s ease-out';
        ripple.style.pointerEvents = 'none';

        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });
  });

  function animateValue(el){
    const text = el.textContent;
    const match = text.match(/[\d,.]+/);
    if(!match) return;

    const finalValue = parseFloat(match[0].replace(/,/g, ''));
    const startValue = 0;
    const duration = 1000;
    const startTime = Date.now();
    const prefix = text.match(/\$/) ? '$' : '';
    const suffix = text.replace(/[\d,$.+-]/g, '').trim();

    function update(){
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOut = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      const current = startValue + (finalValue - startValue) * easeOut;
      el.textContent = prefix + current.toLocaleString('en-US', {maximumFractionDigits:0}) + suffix;

      if(progress < 1){
        requestAnimationFrame(update);
      }
    }

    update();
  }

  window.CBAnimations = { observer, animateValue };
})(window);
