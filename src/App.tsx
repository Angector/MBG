/* === FILE: src/App.tsx === */
/* Project: Mobogram — Phase 3 */
/* Purpose: Demo page to verify all Phase 3 components visually */

import { useState } from 'react';

function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div style={{ flex: 1 }}>
      {/* Header */}
      <header
        style={{
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          paddingInline: 'var(--space-6)',
          background: 'var(--color-surface)',
          boxShadow: 'var(--shadow-card)',
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
            </ul>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container" style={{ paddingBlock: 'var(--space-10)' }}>
        <div className="stack stack--loose">

          {/* ===== PLACEHOLDER ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>پلیس‌ هولدر — Placeholder</h2>
            <div className="row" style={{ gap: 'var(--space-4)' }}>
              <div className="aspect-square" style={{ width: '120px' }}>
                <div className="placeholder"></div>
              </div>
              <div className="aspect-16x9" style={{ width: '200px' }}>
                <div className="placeholder"></div>
              </div>
              <div className="aspect-4x3" style={{ width: '160px' }}>
                <div className="placeholder"></div>
              </div>
            </div>

            <h3 style={{ marginBlockStart: 'var(--space-6)' }}>Image Frame</h3>
            <div className="img-frame aspect-square" style={{ maxWidth: '240px' }}>
              <div className="placeholder"></div>
            </div>
          </section>

          {/* ===== SKELETON ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>اسکلتون — Skeleton</h2>
            <div className="row" style={{ gap: 'var(--space-5)', alignItems: 'flex-start' }}>
              {/* Skeleton card */}
              <div className="skeleton-card" style={{ width: '220px' }}>
                <div className="skeleton skeleton--image"></div>
                <div className="skeleton skeleton--title"></div>
                <div className="skeleton skeleton--line"></div>
                <div className="skeleton skeleton--price" style={{ height: '0.9em', width: '40%', borderRadius: 'var(--radius-xs)' }}></div>
              </div>

              {/* Skeleton list */}
              <div className="skeleton-list" style={{ flex: 1, maxWidth: '400px' }}>
                <div className="skeleton-row">
                  <div className="skeleton skeleton--circle"></div>
                  <div className="skeleton-row__lines">
                    <div className="skeleton skeleton--text" style={{ width: '70%' }}></div>
                    <div className="skeleton skeleton--text-sm" style={{ width: '50%' }}></div>
                  </div>
                </div>
                <div className="skeleton-row">
                  <div className="skeleton skeleton--circle"></div>
                  <div className="skeleton-row__lines">
                    <div className="skeleton skeleton--text" style={{ width: '60%' }}></div>
                    <div className="skeleton skeleton--text-sm" style={{ width: '40%' }}></div>
                  </div>
                </div>
                <div className="skeleton-row">
                  <div className="skeleton skeleton--circle"></div>
                  <div className="skeleton-row__lines">
                    <div className="skeleton skeleton--text" style={{ width: '80%' }}></div>
                    <div className="skeleton skeleton--text-sm" style={{ width: '45%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===== TOAST ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>اعلان — Toast</h2>
            <div className="row">
              <button className="btn btn--primary" onClick={() => setToastVisible(true)}>
                نمایش اعلان
              </button>
            </div>

            {toastVisible && (
              <div className="toast-region" style={{ position: 'relative', inset: 'auto', marginBlockStart: 'var(--space-4)' }}>
                <div className="toast toast--success">
                  <span className="toast__icon">✓</span>
                  <div className="toast__body">
                    <div className="toast__title">موفق</div>
                    <div className="toast__message">محصول به سبد خرید اضافه شد.</div>
                  </div>
                  <button className="toast__close" onClick={() => setToastVisible(false)} aria-label="بستن">×</button>
                </div>
                <div className="toast toast--error">
                  <span className="toast__icon">✕</span>
                  <div className="toast__body">
                    <div className="toast__title">خطا</div>
                    <div className="toast__message">لطفاً دوباره تلاش کنید.</div>
                  </div>
                  <button className="toast__close" onClick={() => setToastVisible(false)} aria-label="بستن">×</button>
                </div>
                <div className="toast toast--info">
                  <span className="toast__icon">ℹ</span>
                  <div className="toast__body">
                    <div className="toast__title">اطلاعات</div>
                    <div className="toast__message">به‌روزرسانی جدید در دسترس است.</div>
                  </div>
                  <button className="toast__close" onClick={() => setToastVisible(false)} aria-label="بستن">×</button>
                </div>
              </div>
            )}
          </section>

          {/* ===== MODAL ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>مودال — Modal</h2>
            <button className="btn btn--primary" onClick={() => setModalOpen(true)}>
              باز کردن مودال
            </button>

            {modalOpen && (
              <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div className="modal__backdrop" onClick={() => setModalOpen(false)}></div>
                <div className="modal__dialog">
                  <div className="modal__header">
                    <h3 className="modal__title" id="modal-title">عنوان مودال</h3>
                    <button className="modal__close" onClick={() => setModalOpen(false)} aria-label="بستن">×</button>
                  </div>
                  <div className="modal__body">
                    <p>این محتوای مودال است. می‌توانید هر اطلاعاتی را اینجا قرار دهید.</p>
                    <p>مودال با backdrop blur و انیمیشن pop-in نمایش داده می‌شود.</p>
                  </div>
                  <div className="modal__footer">
                    <button className="btn btn--ghost" onClick={() => setModalOpen(false)}>انصراف</button>
                    <button className="btn btn--primary" onClick={() => setModalOpen(false)}>تأیید</button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ===== DROPDOWN ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>دراپ‌داون — Dropdown</h2>
            <div className="dropdown">
              <button
                className="dropdown__trigger"
                aria-expanded={dropdownOpen}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span>مرتب‌سازی</span>
                <span className="dropdown__caret"></span>
              </button>
              <div className="dropdown__menu" data-open={dropdownOpen ? "true" : "false"}>
                <button className="dropdown__item" aria-checked="true">جدیدترین</button>
                <button className="dropdown__item">ارزان‌ترین</button>
                <button className="dropdown__item">گران‌ترین</button>
                <div className="dropdown__separator"></div>
                <button className="dropdown__item">پرفروش‌ترین</button>
                <button className="dropdown__item" disabled>محبوب‌ترین</button>
              </div>
            </div>
          </section>

          {/* ===== TOOLTIP ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>تولتیپ — Tooltip</h2>
            <div className="row" style={{ gap: 'var(--space-6)' }}>
              <div className="tooltip" tabIndex={0}>
                <button className="btn btn--secondary">بالا (پیش‌فرض)</button>
                <div className="tooltip__bubble">این یک تولتیپ است</div>
              </div>
              <div className="tooltip tooltip--bottom" tabIndex={0}>
                <button className="btn btn--secondary">پایین</button>
                <div className="tooltip__bubble">تولتیپ پایین</div>
              </div>
            </div>
          </section>

          {/* ===== GALLERY ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>گالری — Gallery</h2>
            <div className="gallery" style={{ maxWidth: '480px' }}>
              <div className="gallery__stage">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`gallery__slide ${galleryIndex === i ? 'is-active' : ''}`}>
                    <div className="placeholder"></div>
                  </div>
                ))}
                <button
                  className="gallery__nav gallery__nav--prev"
                  onClick={() => setGalleryIndex((galleryIndex - 1 + 3) % 3)}
                  aria-label="قبلی"
                >
                  ‹
                </button>
                <button
                  className="gallery__nav gallery__nav--next"
                  onClick={() => setGalleryIndex((galleryIndex + 1) % 3)}
                  aria-label="بعدی"
                >
                  ›
                </button>
                <div className="gallery__counter">{galleryIndex + 1} / 3</div>
              </div>
              <div className="gallery__thumbs">
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    className={`gallery__thumb ${galleryIndex === i ? 'is-active' : ''}`}
                    onClick={() => setGalleryIndex(i)}
                    aria-label={`تصویر ${i + 1}`}
                  >
                    <div className="placeholder"></div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ===== BLUR-UP IMAGE ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>تصویر بلور-آپ — Blur-up Image</h2>
            <div className="img-blur aspect-square" style={{ maxWidth: '240px', borderRadius: 'var(--radius-lg)' }}>
              <div className="img-blur__blur" style={{ background: 'linear-gradient(135deg, #C8CEDF 0%, #E4E6EE 100%)' }}></div>
              <div className={`img-blur__full ${imageLoaded ? '' : ''}`} style={{ background: 'var(--color-surface-3)' }}>
                <div className="placeholder"></div>
              </div>
            </div>
            <button
              className="btn btn--secondary"
              style={{ marginBlockStart: 'var(--space-3)' }}
              onClick={() => setImageLoaded(!imageLoaded)}
            >
              {imageLoaded ? 'بازنشانی' : 'شبیه‌سازی بارگذاری'}
            </button>
          </section>

          {/* ===== DRAWER ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>دراور — Drawer</h2>
            <button className="btn btn--primary" onClick={() => setDrawerOpen(true)}>
              باز کردن دراور
            </button>

            {drawerOpen && (
              <div className="drawer" role="dialog" aria-modal="true">
                <div className="drawer__backdrop" onClick={() => setDrawerOpen(false)}></div>
                <div className="drawer__panel">
                  <div className="drawer__header">
                    <h3 className="drawer__title">سبد خرید</h3>
                    <button className="drawer__close" onClick={() => setDrawerOpen(false)} aria-label="بستن">×</button>
                  </div>
                  <div className="drawer__body">
                    <div className="drawer__empty">
                      <p>سبد خرید شما خالی است.</p>
                    </div>
                  </div>
                  <div className="drawer__footer">
                    <button className="btn btn--primary btn--block">تکمیل خرید</button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ===== BOTTOM SHEET ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>باتم شیت — Bottom Sheet</h2>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              (فقط در موبایل نمایش داده می‌شود — در دسکتاپ مخفی است)
            </p>
            <button className="btn btn--primary" onClick={() => setSheetOpen(true)}>
              باز کردن شیت
            </button>

            {sheetOpen && (
              <div className="sheet" role="dialog" aria-modal="true">
                <div className="sheet__backdrop" onClick={() => setSheetOpen(false)}></div>
                <div className="sheet__panel">
                  <div className="sheet__handle"></div>
                  <div className="sheet__header">
                    <h3 className="sheet__title">فیلترها</h3>
                    <button className="drawer__close" onClick={() => setSheetOpen(false)} aria-label="بستن">×</button>
                  </div>
                  <div className="sheet__body">
                    <div className="stack">
                      <div className="form-control">
                        <label className="form-label">برند</label>
                        <div className="chip-group">
                          <button className="chip" aria-pressed="true">همه</button>
                          <button className="chip">سامسونگ</button>
                          <button className="chip">اپل</button>
                          <button className="chip">شیائومی</button>
                        </div>
                      </div>
                      <div className="form-control">
                        <label className="form-label">محدوده قیمت</label>
                        <input className="input" type="text" placeholder="حداقل قیمت" />
                        <input className="input" type="text" placeholder="حداکثر قیمت" />
                      </div>
                    </div>
                  </div>
                  <div className="sheet__footer">
                    <button className="btn btn--ghost" onClick={() => setSheetOpen(false)}>بازنشانی</button>
                    <button className="btn btn--primary" onClick={() => setSheetOpen(false)}>اعمال</button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ===== STICKY BAR ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>نوار چسبان — Sticky Bar</h2>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              (فقط در موبایل نمایش داده می‌شود)
            </p>
            <button className="btn btn--primary" onClick={() => setStickyVisible(!stickyVisible)}>
              {stickyVisible ? 'مخفی کردن' : 'نمایش'} نوار چسبان
            </button>
          </section>

        </div>
      </main>

      {/* Sticky Bar */}
      <div className={`sticky-bar ${stickyVisible ? 'is-visible' : ''}`}>
        <div className="sticky-bar__info">
          <span className="sticky-bar__label">قیمت</span>
          <span className="sticky-bar__price">۵۲,۰۰۰,۰۰۰ تومان</span>
        </div>
        <div className="sticky-bar__actions">
          <button className="btn btn--primary">افزودن به سبد</button>
        </div>
      </div>

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
          <p>موبوگرام — فاز ۳: کامپوننت‌های پیشرفته</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
