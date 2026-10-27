/* === FILE: src/App.tsx === */
/* Project: Mobogram — Phase 4 */
/* Purpose: Demo page to verify all Phase 4 animations visually */

import { useState, useEffect } from 'react';

function App() {
  const [showReveal, setShowReveal] = useState(false);
  const [showShake, setShowShake] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [showFlashSuccess, setShowFlashSuccess] = useState(false);
  const [showFlashError, setShowFlashError] = useState(false);
  const [showFlyItem, setShowFlyItem] = useState(false);
  const [showCartPulse, setShowCartPulse] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const triggerAnimation = (setter: (v: boolean) => void, duration = 1000) => {
    setter(true);
    setTimeout(() => setter(false), duration);
  };

  return (
    <div style={{ flex: 1 }}>
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        پرش به محتوای اصلی
      </a>

      {/* Header with scroll effect */}
      <header
        className={`site-header ${isScrolled ? 'is-scrolled' : ''}`}
        style={{
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          paddingInline: 'var(--space-6)',
          background: 'var(--color-surface)',
          position: 'sticky',
          insetBlockStart: 0,
          zIndex: 'var(--z-header)',
        }}
      >
        <div className="container row row--between">
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>
            موبوگرام
          </h1>
          <nav>
            <ul className="row">
              <li><a href="#" style={{ fontSize: 'var(--text-sm)' }}>خانه</a></li>
              <li><a href="#" style={{ fontSize: 'var(--text-sm)' }}>محصولات</a></li>
              <li><a href="#" style={{ fontSize: 'var(--text-sm)' }}>تماس</a></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="container" style={{ paddingBlock: 'var(--space-10)' }}>
        <div className="stack stack--loose">

          {/* ===== SCROLL REVEAL ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>اسکرول ریویل — Scroll Reveal</h2>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginBlockEnd: 'var(--space-4)' }}>
              اسکرول کنید تا المان‌ها با انیمیشن ظاهر شوند
            </p>
            <button className="btn btn--primary" onClick={() => setShowReveal(!showReveal)}>
              {showReveal ? 'مخفی کردن' : 'نمایش'} المان‌های ریویل
            </button>

            {showReveal && (
              <div className="stagger" style={{ marginBlockStart: 'var(--space-4)', '--stagger-step': '100ms' } as React.CSSProperties}>
                <div className="reveal reveal--up is-revealed" style={{ '--stagger-index': 0 } as React.CSSProperties}>
                  <div className="row">
                    <div className="badge badge--success">۱</div>
                    <span>ریویل از پایین</span>
                  </div>
                </div>
                <div className="reveal reveal--fade is-revealed" style={{ '--stagger-index': 1 } as React.CSSProperties}>
                  <div className="row">
                    <div className="badge badge--info">۲</div>
                    <span>ریویل فید</span>
                  </div>
                </div>
                <div className="reveal reveal--scale is-revealed" style={{ '--stagger-index': 2 } as React.CSSProperties}>
                  <div className="row">
                    <div className="badge badge--warning">۳</div>
                    <span>ریویل با اسکیل</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ===== MICRO-INTERACTIONS ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>میکرو-اینتراکشن‌ها — Micro-Interactions</h2>
            <div className="row" style={{ gap: 'var(--space-4)' }}>
              <button
                className={`btn btn--secondary ${showShake ? 'shake' : ''}`}
                onClick={() => triggerAnimation(setShowShake, 600)}
              >
                لرزش (Shake)
              </button>

              <button
                className={`btn btn--ghost ${showHeartPop ? 'heart-pop' : ''}`}
                onClick={() => triggerAnimation(setShowHeartPop, 400)}
                style={{ position: 'relative' }}
              >
                ❤️ پاپ قلب
              </button>

              <button
                className={`btn btn--primary ${showFlashSuccess ? 'flash-success' : ''}`}
                onClick={() => triggerAnimation(setShowFlashSuccess, 600)}
              >
                فلش موفقیت
              </button>

              <button
                className={`btn btn--danger ${showFlashError ? 'flash-error' : ''}`}
                onClick={() => triggerAnimation(setShowFlashError, 600)}
              >
                فلش خطا
              </button>
            </div>
          </section>

          {/* ===== FLY-TO-CART ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>پرواز به سبد — Fly-to-Cart</h2>
            <div className="row" style={{ gap: 'var(--space-6)', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <div className="img-frame aspect-square" style={{ width: '120px' }}>
                  <div className="placeholder"></div>
                </div>
                <button
                  className="btn btn--primary btn--sm"
                  style={{ marginBlockStart: 'var(--space-2)' }}
                  onClick={() => {
                    setShowFlyItem(true);
                    setTimeout(() => {
                      setShowFlyItem(false);
                      setShowCartPulse(true);
                      setTimeout(() => setShowCartPulse(false), 400);
                    }, 800);
                  }}
                >
                  افزودن به سبد
                </button>
              </div>

              <div className={`btn btn--secondary btn--icon ${showCartPulse ? 'cart-pulse' : ''}`}>
                🛒
              </div>
            </div>

            {showFlyItem && (
              <div className="fly-item" style={{ top: '50%', left: '20%' }}>
                <div className="placeholder"></div>
              </div>
            )}
          </section>

          {/* ===== LOADING & FEEDBACK ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>بارگذاری و فیدبک — Loading & Feedback</h2>
            <div className="row" style={{ gap: 'var(--space-6)', alignItems: 'center' }}>
              <div>
                <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBlockEnd: 'var(--space-2)' }}>
                  اسپینر معمولی
                </p>
                <div className="spinner"></div>
              </div>

              <div>
                <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBlockEnd: 'var(--space-2)' }}>
                  اسپینر بزرگ
                </p>
                <div className="spinner spinner--lg"></div>
              </div>

              <div style={{ flex: 1, maxWidth: '300px' }}>
                <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBlockEnd: 'var(--space-2)' }}>
                  نوار پیشرفت نامعین
                </p>
                <div className="progress-indeterminate"></div>
              </div>
            </div>

            <div style={{ marginBlockStart: 'var(--space-6)' }}>
              <button className="btn btn--primary" aria-busy="true">
                در حال بارگذاری
              </button>
            </div>
          </section>

          {/* ===== COUNTER ANIMATIONS ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>شمارنده — Counter</h2>
            <div className="row" style={{ gap: 'var(--space-6)' }}>
              <div>
                <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBlockEnd: 'var(--space-2)' }}>
                  تیک رقم
                </p>
                <div className="digit-tick" style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>
                  ۱۲۸
                </div>
              </div>

              <div>
                <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBlockEnd: 'var(--space-2)' }}>
                  درخشش افزایش
                </p>
                <div className="increment-glow" style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
                  +۱۵
                </div>
              </div>
            </div>
          </section>

          {/* ===== EMPTY & ERROR STATES ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>حالت‌های خالی و خطا — Empty & Error States</h2>
            <div className="row" style={{ gap: 'var(--space-8)', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="empty-float" style={{ fontSize: '48px', marginBlockEnd: 'var(--space-3)' }}>
                  📦
                </div>
                <p className="text-muted">سبد خرید شما خالی است</p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div className="error-bob" style={{ fontSize: '48px', marginBlockEnd: 'var(--space-3)' }}>
                  ⚠️
                </div>
                <p className="text-muted">خطایی رخ داد</p>
              </div>
            </div>
          </section>

          {/* ===== PAGE ENTER ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>ورود صفحه — Page Enter</h2>
            <div className="page-enter" style={{
              padding: 'var(--space-6)',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)'
            }}>
              <p>این محتوا با انیمیشن page-enter ظاهر شده است.</p>
            </div>
          </section>

          {/* ===== SKELETON STAGGER ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>اسکلتون استگر — Skeleton Stagger</h2>
            <div className="skeleton-stagger" style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div className="skeleton skeleton--image" style={{ width: '80px', height: '80px' }}></div>
              <div className="skeleton skeleton--image" style={{ width: '80px', height: '80px' }}></div>
              <div className="skeleton skeleton--image" style={{ width: '80px', height: '80px' }}></div>
              <div className="skeleton skeleton--image" style={{ width: '80px', height: '80px' }}></div>
            </div>
          </section>

        </div>
      </main>

      {/* Back to top button */}
      <button
        className={`back-to-top ${showBackToTop ? 'is-visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="بازگشت به بالا"
      >
        ↑
      </button>

      {/* Footer */}
      <footer
        style={{
          paddingBlock: 'var(--space-8)',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-sm)',
        }}
      >
        <div className="container">
          <p>موبوگرام — فاز ۴: سیستم حرکت CSS</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
