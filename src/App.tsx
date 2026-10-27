/* === FILE: src/App.tsx === */
/* Project: Mobogram — Phase 2 */
/* Purpose: Demo page to verify all Phase 2 components visually */

function App() {
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

          {/* ===== BUTTONS ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>دکمه‌ها — Buttons</h2>
            <div className="stack stack--tight">
              <h3>Variants</h3>
              <div className="row">
                <button className="btn btn--primary">اصلی</button>
                <button className="btn btn--secondary">ثانویه</button>
                <button className="btn btn--ghost">شبح</button>
                <button className="btn btn--danger">خطر</button>
                <button className="btn btn--outline">خط‌دار</button>
                <button className="btn btn--link">لینک</button>
              </div>

              <h3>Sizes</h3>
              <div className="row">
                <button className="btn btn--primary btn--sm">کوچک</button>
                <button className="btn btn--primary">معمولی</button>
                <button className="btn btn--primary btn--lg">بزرگ</button>
              </div>

              <h3>States</h3>
              <div className="row">
                <button className="btn btn--primary" disabled>غیرفعال</button>
                <button className="btn btn--secondary" disabled>غیرفعال</button>
                <button className="btn btn--primary" aria-busy="true">در حال بارگذاری</button>
              </div>

              <h3>Layout</h3>
              <div className="row">
                <button className="btn btn--primary btn--block">تمام عرض</button>
              </div>
              <div className="row">
                <button className="btn btn--primary btn--icon" aria-label="افزودن">+</button>
                <button className="btn btn--secondary btn--icon btn--sm" aria-label="تنظیمات">⚙</button>
              </div>

              <h3>Group</h3>
              <div className="btn-group">
                <button className="btn btn--secondary">چپ</button>
                <button className="btn btn--secondary">وسط</button>
                <button className="btn btn--secondary">راست</button>
              </div>
              <div className="btn-group btn-group--attached" style={{ marginBlockStart: 'var(--space-3)' }}>
                <button className="btn btn--secondary">چپ</button>
                <button className="btn btn--secondary">وسط</button>
                <button className="btn btn--secondary">راست</button>
              </div>
            </div>
          </section>

          {/* ===== BADGES ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>نشان‌ها — Badges</h2>
            <div className="row">
              <span className="badge">۳</span>
              <span className="badge badge--neutral">۱۲</span>
              <span className="badge badge--success">تأیید</span>
              <span className="badge badge--warning">هشدار</span>
              <span className="badge badge--danger">۵</span>
            </div>
            <div style={{ marginBlockStart: 'var(--space-4)' }}>
              <h3>Floating badge</h3>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button className="btn btn--secondary btn--icon" aria-label="سبد خرید">
                  🛒
                </button>
                <span className="badge badge--floating">۲</span>
              </div>
            </div>
          </section>

          {/* ===== INPUTS ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>ورودی‌ها — Inputs</h2>
            <div className="stack stack--tight">
              <input className="input" type="text" placeholder="ورودی عادی" />
              <input className="input" type="text" placeholder="ورودی غیرفعال" disabled />
              <input className="input" type="text" placeholder="ورودی نامعتبر" aria-invalid="true" />
              <input className="input input--search" type="search" placeholder="جستجو..." />
              <select className="input">
                <option>انتخاب کنید</option>
                <option>گزینه ۱</option>
                <option>گزینه ۲</option>
              </select>
              <textarea className="input" placeholder="متن طولانی..." rows={3}></textarea>

              <h3>Sizes</h3>
              <input className="input input--sm" type="text" placeholder="کوچک" />
              <input className="input input--lg" type="text" placeholder="بزرگ" />

              <h3>Input with addon</h3>
              <div className="input-wrap">
                <span className="input-wrap__icon">🔍</span>
                <input className="input" type="text" placeholder="جستجو با آیکون" />
              </div>
            </div>
          </section>

          {/* ===== FORM ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>فرم — Form</h2>
            <form className="form" onSubmit={(e) => e.preventDefault()}>
              <div className="form-control">
                <label className="form-label">
                  نام محصول
                  <span className="form-required">*</span>
                </label>
                <input className="input" type="text" placeholder="نام محصول را وارد کنید" />
                <span className="form-helper">نام محصول باید حداقل ۳ حرف باشد.</span>
              </div>

              <div className="form-control" data-invalid="true">
                <label className="form-label">قیمت</label>
                <input className="input" type="text" aria-invalid="true" value="abc" readOnly />
                <span className="form-error">قیمت باید عدد باشد.</span>
              </div>

              <fieldset className="fieldset">
                <legend className="fieldset__legend">اطلاعات تکمیلی</legend>
                <div className="form-control">
                  <label className="form-label">توضیحات</label>
                  <textarea className="input" rows={3} placeholder="توضیحات محصول..."></textarea>
                </div>
              </fieldset>

              <div className="row">
                <label className="check">
                  <input type="checkbox" defaultChecked />
                  <span>موجود است</span>
                </label>
                <label className="check">
                  <input type="radio" name="brand" defaultChecked />
                  <span>سامسونگ</span>
                </label>
                <label className="check">
                  <input type="radio" name="brand" />
                  <span>اپل</span>
                </label>
              </div>

              <div className="form-actions">
                <button className="btn btn--ghost" type="button">انصراف</button>
                <button className="btn btn--primary" type="submit">ذخیره</button>
              </div>
            </form>
          </section>

          {/* ===== CHIPS ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>تراشه‌ها — Chips</h2>
            <div className="stack stack--tight">
              <div className="chip-group">
                <button className="chip" aria-pressed="true">همه</button>
                <button className="chip">سامسونگ</button>
                <button className="chip">اپل</button>
                <button className="chip">شیائومی</button>
                <button className="chip" disabled>گوگل</button>
              </div>

              <h3>Small chips</h3>
              <div className="chip-group">
                <button className="chip chip--sm" aria-pressed="true">۱۲۸GB</button>
                <button className="chip chip--sm">۲۵۶GB</button>
                <button className="chip chip--sm">۵۱۲GB</button>
              </div>

              <h3>Removable chips</h3>
              <div className="chip-group">
                <span className="chip" aria-pressed="true">
                  سامسونگ
                  <button className="chip__remove" aria-label="حذف">×</button>
                </span>
                <span className="chip" aria-pressed="true">
                  بالای ۱۰ میلیون
                  <button className="chip__remove" aria-label="حذف">×</button>
                </span>
              </div>

              <h3>Scrollable chip group</h3>
              <div className="chip-group chip-group--scroll">
                {['سامسونگ', 'اپل', 'شیائومی', 'گوگل', 'هواوی', 'وان‌پلاس', 'نوکیا', 'سونی'].map((brand) => (
                  <button className="chip" key={brand}>{brand}</button>
                ))}
              </div>
            </div>
          </section>

          {/* ===== RATING ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>امتیاز — Rating</h2>
            <div className="stack stack--tight">
              <div className="rating">
                <div className="rating__stars">
                  <span className="rating__star"></span>
                  <span className="rating__star"></span>
                  <span className="rating__star"></span>
                  <span className="rating__star"></span>
                  <span className="rating__star rating__star--half"></span>
                </div>
                <span className="rating__value">۴.۵</span>
                <span className="rating__count">(۱۲۸ نظر)</span>
              </div>

              <div className="rating rating--sm">
                <div className="rating__stars">
                  <span className="rating__star"></span>
                  <span className="rating__star"></span>
                  <span className="rating__star"></span>
                  <span className="rating__star rating__star--empty"></span>
                  <span className="rating__star rating__star--empty"></span>
                </div>
                <span className="rating__value">۳.۰</span>
              </div>

              <div className="rating rating--lg">
                <div className="rating__stars">
                  <span className="rating__star"></span>
                  <span className="rating__star"></span>
                  <span className="rating__star"></span>
                  <span className="rating__star"></span>
                  <span className="rating__star"></span>
                </div>
                <span className="rating__value">۵.۰</span>
              </div>
            </div>
          </section>

          {/* ===== TABLE ===== */}
          <section>
            <h2 style={{ marginBlockEnd: 'var(--space-5)' }}>جدول — Table</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>محصول</th>
                    <th>برند</th>
                    <th>قیمت</th>
                    <th>وضعیت</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="row">
                        <div className="table__thumb"></div>
                        <span>Galaxy S24 Ultra</span>
                      </div>
                    </td>
                    <td>سامسونگ</td>
                    <td>۵۲,۰۰۰,۰۰۰ تومان</td>
                    <td><span className="badge badge--success">موجود</span></td>
                    <td>
                      <div className="table__actions">
                        <button className="btn btn--ghost btn--sm">ویرایش</button>
                        <button className="btn btn--danger btn--sm">حذف</button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div className="row">
                        <div className="table__thumb"></div>
                        <span>iPhone 15 Pro</span>
                      </div>
                    </td>
                    <td>اپل</td>
                    <td>۶۸,۰۰۰,۰۰۰ تومان</td>
                    <td><span className="badge badge--success">موجود</span></td>
                    <td>
                      <div className="table__actions">
                        <button className="btn btn--ghost btn--sm">ویرایش</button>
                        <button className="btn btn--danger btn--sm">حذف</button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div className="row">
                        <div className="table__thumb"></div>
                        <span>Xiaomi 14</span>
                      </div>
                    </td>
                    <td>شیائومی</td>
                    <td>۲۸,۰۰۰,۰۰۰ تومان</td>
                    <td><span className="badge badge--warning">کم</span></td>
                    <td>
                      <div className="table__actions">
                        <button className="btn btn--ghost btn--sm">ویرایش</button>
                        <button className="btn btn--danger btn--sm">حذف</button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div className="row">
                        <div className="table__thumb"></div>
                        <span>Pixel 8 Pro</span>
                      </div>
                    </td>
                    <td>گوگل</td>
                    <td>۴۵,۰۰۰,۰۰۰ تومان</td>
                    <td><span className="badge badge--danger">ناموجود</span></td>
                    <td>
                      <div className="table__actions">
                        <button className="btn btn--ghost btn--sm">ویرایش</button>
                        <button className="btn btn--danger btn--sm">حذف</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ marginBlockStart: 'var(--space-6)' }}>Compact table</h3>
            <div className="table-wrap">
              <table className="table table--compact">
                <thead>
                  <tr>
                    <th>ردیف</th>
                    <th>عنوان</th>
                    <th>مقدار</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>۱</td><td>گوشی سامسونگ</td><td>۱۵</td></tr>
                  <tr><td>۲</td><td>گوشی اپل</td><td>۸</td></tr>
                  <tr><td>۳</td><td>گوشی شیائومی</td><td>۲۲</td></tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ marginBlockStart: 'var(--space-6)' }}>Empty table</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>محصول</th>
                    <th>قیمت</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={2}>
                      <div className="table__empty">
                        <p>هیچ محصولی یافت نشد.</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
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
          <p>موبوگرام — فاز ۲: کامپوننت‌های اصلی</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
