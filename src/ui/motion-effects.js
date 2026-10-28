// === FILE: src/ui/motion-effects.js ===
// Project: Mobogram — Phase 17: Motion Magic
// Purpose: Premium motion effects — 3D tilt, magnetic buttons, confetti, scroll progress, text reveal, view transitions

// ===== SECTION 0: Imports =====
import { throttle } from '../utils.js';

// ===== SECTION 1: Helpers =====

/**
 * Check if user prefers reduced motion.
 * @returns {boolean}
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ===== SECTION 2: 3D Tilt Effect =====

/**
 * Apply 3D tilt effect to elements matching selector.
 * On mousemove: calculate rotation based on cursor position.
 * Injects a .card-glare div for light reflection effect.
 * @param {string} selector - CSS selector for target elements
 * @returns {void}
 * @example applyTiltEffect('.product-card');
 */
export function applyTiltEffect(selector) {
  if (prefersReducedMotion()) return;

  const elements = document.querySelectorAll(selector);
  if (!elements.length) return;

  elements.forEach((el) => {
    // Skip if already initialized
    if (el.dataset.tiltInitialized) return;
    el.dataset.tiltInitialized = 'true';

    // Ensure relative positioning for glare
    const computedStyle = window.getComputedStyle(el);
    if (computedStyle.position === 'static') {
      el.style.position = 'relative';
    }
    el.style.overflow = 'hidden';

    // Create glare element
    let glare = el.querySelector('.card-glare');
    if (!glare) {
      glare = document.createElement('div');
      glare.className = 'card-glare';
      el.appendChild(glare);
    }

    const maxTilt = 15; // degrees
    const perspective = 1000; // px

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate rotation based on mouse position
      const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * maxTilt;
      const rotateX = -((e.clientY - centerY) / (rect.height / 2)) * maxTilt;

      el.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      el.style.transition = 'transform 0.1s ease-out';

      // Update glare position
      const glareX = ((e.clientX - rect.left) / rect.width) * 100;
      const glareY = ((e.clientY - rect.top) / rect.height) * 100;
      glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.3) 0%, transparent 80%)`;
    };

    const handleMouseLeave = () => {
      el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      el.style.transition = 'transform 0.3s ease-out';
      glare.style.background = 'transparent';
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    // Store cleanup function
    el._tiltCleanup = () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      if (glare && glare.parentNode) {
        glare.parentNode.removeChild(glare);
      }
    };
  });
}

// ===== SECTION 3: Magnetic Button Effect =====

/**
 * Apply magnetic effect to buttons - they follow cursor within a radius.
 * @param {string} selector - CSS selector for target elements
 * @returns {void}
 * @example applyMagneticEffect('.btn--primary');
 */
export function applyMagneticEffect(selector) {
  if (prefersReducedMotion()) return;

  const elements = document.querySelectorAll(selector);
  if (!elements.length) return;

  elements.forEach((el) => {
    // Skip if already initialized
    if (el.dataset.magneticInitialized) return;
    el.dataset.magneticInitialized = 'true';

    const radius = 20; // px beyond element bounds
    const maxTranslate = 5; // px

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Check if cursor is within radius
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = Math.max(rect.width, rect.height) / 2 + radius;

      if (distance <= maxDistance) {
        // Calculate translation (normalized and scaled)
        const translateX = (dx / maxDistance) * maxTranslate;
        const translateY = (dy / maxDistance) * maxTranslate;

        el.style.transform = `translate(${translateX}px, ${translateY}px)`;
        el.style.transition = 'transform 0.2s ease-out';
      }
    };

    const handleMouseLeave = () => {
      el.style.transform = 'translate(0, 0)';
      el.style.transition = 'transform 0.3s ease-out';
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    // Store cleanup function
    el._magneticCleanup = () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  });
}

// ===== SECTION 4: Confetti Effect =====

/**
 * Fire confetti particles from a point.
 * Creates a canvas overlay and animates particles with gravity.
 * @param {number} x - X coordinate (clientX)
 * @param {number} y - Y coordinate (clientY)
 * @returns {void}
 * @example fireConfetti(event.clientX, event.clientY);
 */
export function fireConfetti(x, y) {
  if (prefersReducedMotion()) return;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const colors = ['#FF5548', '#E8463A', '#FFD700', '#00CED1', '#FF69B4', '#7B68EE'];
  const particles = [];
  const particleCount = 30;

  // Create particles
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10 - 5,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      gravity: 0.3,
      friction: 0.98,
      opacity: 1,
    });
  }

  let startTime = Date.now();
  const duration = 1500; // ms

  const animate = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > duration) {
      // Clean up
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      // Update physics
      p.vy += p.gravity;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      // Fade out
      p.opacity = Math.max(0, 1 - elapsed / duration);

      // Draw
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    requestAnimationFrame(animate);
  };

  animate();
}

// ===== SECTION 5: Scroll Progress =====

/**
 * Initialize scroll progress bar at top of page.
 * Creates a fixed div that fills based on scroll position.
 * @returns {void}
 * @example initScrollProgress();
 */
export function initScrollProgress() {
  // Create progress bar
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.appendChild(progressBar);

  // Throttled scroll handler
  const updateProgress = throttle(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = `${progress}%`;
  }, 100);

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress(); // Initial call
}

// ===== SECTION 6: Text Reveal =====

/**
 * Initialize text reveal animation for headings.
 * Splits text into words and animates them on scroll into view.
 * @param {string} selector - CSS selector for target elements
 * @returns {void}
 * @example initTextReveal('.hero-title');
 */
export function initTextReveal(selector) {
  if (prefersReducedMotion()) return;

  const elements = document.querySelectorAll(selector);
  if (!elements.length) return;

  elements.forEach((el) => {
    // Skip if already initialized
    if (el.dataset.textRevealInitialized) return;
    el.dataset.textRevealInitialized = 'true';

    // Split text into words
    const text = el.textContent.trim();
    const words = text.split(/\s+/);
    el.innerHTML = '';

    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.className = 'text-reveal-word';
      span.textContent = word;
      span.style.transitionDelay = `${index * 0.1}s`;
      el.appendChild(span);

      // Add space after word (except last)
      if (index < words.length - 1) {
        el.appendChild(document.createTextNode(' '));
      }
    });

    // IntersectionObserver to trigger animation
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const wordSpans = el.querySelectorAll('.text-reveal-word');
            wordSpans.forEach((span) => {
              span.classList.add('is-visible');
            });
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
  });
}

// ===== SECTION 7: View Transitions =====

/**
 * Navigate with View Transitions API if supported.
 * Falls back to standard navigation if not supported.
 * @param {string} url - URL to navigate to
 * @returns {void}
 * @example navigateWithTransition('/products.html');
 */
export function navigateWithTransition(url) {
  if ('startViewTransition' in document) {
    document.startViewTransition(() => {
      window.location.href = url;
    });
  } else {
    window.location.href = url;
  }
}
