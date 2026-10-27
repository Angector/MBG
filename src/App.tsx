/* === FILE: src/App.tsx === */
/* Project: Mobogram — Phase 1 */
/* Purpose: Minimal demo page to verify Phase 1 visual foundation */

function App() {
  return (
    <div style={{ flex: 1 }}>
      {/* Header area */}
      <header
        style={{
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          paddingInline: 'var(--space-6)',
          background: 'var(--color-surface)',
          boxShadow: 'var(--shadow-card)',
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
              <li><a href="#" style={{ fontSize: 'var(--text-sm)' }}>تماس با ما</a></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main content — Phase 1 verification demo */}
      <main className="container" style={{ paddingBlock: 'var(--space-10)' }}>
        <div className="stack stack--loose">
          {/* Typography showcase */}
          <section>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>تایپوگرافی</h2>
            <div className="stack stack--tight">
              <h1>عنوان سطح ۱ — h1</h1>
              <h2>عنوان سطح ۲ — h2</h2>
              <h3>عنوان سطح ۳ — h3</h3>
              <h4>عنوان سطح ۴ — h4</h4>
              <h5>عنوان سطح ۵ — h5</h5>
              <h6>عنوان سطح ۶ — h6</h6>
            </div>
          </section>

          {/* Body text */}
          <section>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>متن بدنه</h2>
            <p>
              موبوگرام فروشگاه آنلاین گوشی‌های هوشمند است. ما بهترین برندها شامل
              سامسونگ، اپل (آیفون)، شیائومی و گوگل را ارائه می‌دهیم.
            </p>
            <p className="text-muted">
              این یک متن خاموش است — برای توضیحات ثانویه استفاده می‌شود.
            </p>
            <p className="text-subtle">
              <small>این یک متن ظریف است — برای راهنماها و نکات.</small>
            </p>
          </section>

          {/* Links */}
          <section>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>لینک‌ها</h2>
            <p>
              برای مشاهده محصولات <a href="#">اینجا کلیک کنید</a> یا{' '}
              <a href="#">با ما تماس بگیرید</a>.
            </p>
          </section>

          {/* Layout utilities demo */}
          <section>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>چیدمان</h2>
            <div className="grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-6)',
                    boxShadow: 'var(--shadow-card)',
                    textAlign: 'center',
                    transition: `box-shadow var(--duration-fast) var(--ease-out-soft), transform var(--duration-fast) var(--ease-out-soft)`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-elevated)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
                  }}
                >
                  <h4>کارت {i}</h4>
                  <p className="text-muted" style={{ marginBlockStart: 'var(--space-2)' }}>
                    نمونه کارت با سایه سه‌لایه
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Color tokens demo */}
          <section>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>رنگ‌ها</h2>
            <div className="row" style={{ gap: 'var(--space-4)' }}>
              {[
                { name: 'accent', color: 'var(--color-accent)' },
                { name: 'success', color: 'var(--color-success)' },
                { name: 'warning', color: 'var(--color-warning)' },
                { name: 'danger', color: 'var(--color-danger)' },
                { name: 'info', color: 'var(--color-info)' },
              ].map((c) => (
                <div
                  key={c.name}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-md)',
                    background: c.color,
                    boxShadow: 'var(--shadow-key)',
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </section>

          {/* Truncation demo */}
          <section>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>برش متن</h2>
            <p className="truncate" style={{ maxWidth: '300px' }}>
              این متن بسیار طولانی است و باید در یک خط بریده شود و سه نقطه نمایش دهد.
            </p>
            <div style={{ maxWidth: '300px', marginBlockStart: 'var(--space-3)' }}>
              <p className="line-clamp-2">
                این متن دو خطی است و بعد از دو خط بریده می‌شود.
                لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ
                و با استفاده از طراحان گرافیک است.
              </p>
            </div>
          </section>
        </div>
      </main>

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
          <p>موبوگرام — فروشگاه آنلاین گوشی هوشمند</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
