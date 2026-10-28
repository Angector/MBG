// === FILE: src/pages/admin.js ===
// Project: Mobogram — Phase 13: Admin Pages
// Purpose: Orchestrate admin pages (dashboard, products, banners, settings)

// ===== SECTION 0: Imports =====
import { ROUTES } from '../config.js';
import { t } from '../i18n.js';
import { $, createEl, show, hide } from '../utils.js';
import { requireAdmin, getSession } from '../services/auth.service.js';
import * as catalog from '../services/catalog.service.js';
import * as shopping from '../services/shopping.service.js';
import { showToast, showModal, showConfirmDialog } from '../ui/primitives.js';
import {
  renderAdminLayout, renderDataTable, renderImageUploader,
  renderProductForm, renderBrandForm, renderSettingsForm,
} from '../ui/admin.ui.js';

// ===== SECTION 1: Bootstrap & Routing =====

/**
 * Initialize the admin page based on the current URL path.
 * Requires admin authentication before rendering any content.
 */
async function initAdmin() {
  try {
    await requireAdmin({ redirectIfNot: true, redirectTo: ROUTES.auth });
    const path = window.location.pathname;

    if (path.endsWith('products.html')) await renderProductsPage();
    else if (path.endsWith('banners.html')) await renderBannersPage();
    else if (path.endsWith('settings.html')) await renderSettingsPage();
    else await renderDashboardPage();
  } catch (err) {
    if (err.name === 'PermissionError' || err.name === 'AuthError') {
      window.location.href = ROUTES.auth;
    } else {
      showToast({ title: t('common.error'), message: err.message, variant: 'error' });
    }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initAdmin);
}

// ===== SECTION 2: Dashboard Page =====

/**
 * Render the admin dashboard with quick stats.
 */
async function renderDashboardPage() {
  const content = createEl('div', { className: 'stack' });
  content.appendChild(createEl('h1', { textContent: t('admin.dashboard') }));

  const { root } = renderAdminLayout('dashboard', content);
  document.body.innerHTML = '';
  document.body.appendChild(root);

  // Load stats
  const stats = createEl('div', { className: 'grid grid--3' });
  stats.style.marginBlockStart = 'var(--space-6)';

  const statCards = [
    { label: t('admin.products'), key: 'products' },
    { label: t('admin.banners'), key: 'banners' },
    { label: t('admin.brands'), key: 'brands' },
  ];

  statCards.forEach(({ label, key }) => {
    const card = createEl('div', { className: 'stack' });
    card.style.padding = 'var(--space-5)';
    card.style.background = 'var(--color-surface)';
    card.style.borderRadius = 'var(--radius-lg)';
    card.style.boxShadow = 'var(--shadow-card)';

    card.appendChild(createEl('div', { className: 'text-muted', textContent: label }));
    const valueEl = createEl('div', { className: 'skeleton skeleton--text', attrs: { style: 'width: 60px; height: 2em;' } });
    card.appendChild(valueEl);
    stats.appendChild(card);

    // Fetch count
    (async () => {
      try {
        let count = 0;
        if (key === 'products') {
          const { total } = await catalog.listProducts({ pageSize: 1 });
          count = total;
        } else if (key === 'banners') {
          const banners = await shopping.listAllBanners();
          count = banners.length;
        } else if (key === 'brands') {
          const brands = await catalog.listBrands();
          count = brands.length;
        }
        valueEl.className = '';
        valueEl.textContent = toPersianDigits(String(count));
        valueEl.style.fontSize = 'var(--text-3xl)';
        valueEl.style.fontWeight = 'var(--weight-bold)';
      } catch (err) {
        valueEl.className = '';
        valueEl.textContent = '—';
      }
    })();
  });

  content.appendChild(stats);
}

function toPersianDigits(str) {
  return String(str).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

// ===== SECTION 3: Products Page =====

/**
 * Render the products management page.
 */
async function renderProductsPage() {
  const content = createEl('div', { className: 'stack' });

  const header = createEl('div', { className: 'row row--between' });
  header.appendChild(createEl('h1', { textContent: t('admin.products') }));
  const addBtn = createEl('button', {
    className: 'btn btn--primary',
    textContent: '+ ' + t('admin.addProduct'),
    attrs: { type: 'button' },
  });
  header.appendChild(addBtn);
  content.appendChild(header);

  const tableContainer = createEl('div');
  tableContainer.appendChild(renderDataTable({
    columns: [t('product.name') || 'Name', t('product.brand') || 'Brand', t('product.price') || 'Price', t('admin.stock') || 'Stock'],
    rows: [],
    renderCells: () => [],
    isLoading: true,
  }));
  content.appendChild(tableContainer);

  const { root } = renderAdminLayout('products', content);
  document.body.innerHTML = '';
  document.body.appendChild(root);

  const refreshTable = async () => {
    tableContainer.innerHTML = '';
    tableContainer.appendChild(renderDataTable({
      columns: [t('product.name') || 'Name', t('product.brand') || 'Brand', t('product.price') || 'Price', t('admin.stock') || 'Stock'],
      rows: [],
      renderCells: () => [],
      isLoading: true,
    }));

    try {
      const { items } = await catalog.listProducts({ pageSize: 100 });
      const brands = await catalog.listBrands();

      tableContainer.innerHTML = '';
      tableContainer.appendChild(renderDataTable({
        columns: [t('product.name') || 'Name', t('product.brand') || 'Brand', t('product.price') || 'Price', t('admin.stock') || 'Stock'],
        rows: items,
        renderCells: (p) => [
          createEl('span', { textContent: p.name }),
          createEl('span', { textContent: p.brand?.name || '—' }),
          createEl('span', { textContent: formatPrice(p.basePrice) }),
          createEl('span', { textContent: toPersianDigits(String(p.variants?.reduce((s, v) => s + v.stock, 0) || 0)) }),
        ],
        renderActions: (p) => [
          createEl('button', {
            className: 'btn btn--ghost btn--sm',
            textContent: t('common.edit'),
            attrs: { type: 'button' },
            on: { click: () => openProductModal(p, brands, refreshTable) },
          }),
          createEl('button', {
            className: 'btn btn--danger btn--sm',
            textContent: t('common.delete'),
            attrs: { type: 'button' },
            on: { click: async () => {
              const confirmed = await showConfirmDialog({
                title: t('admin.deleteProduct'),
                message: t('admin.confirmDelete'),
                confirmVariant: 'danger',
              });
              if (confirmed) {
                try {
                  await catalog.deleteProduct(p.id);
                  showToast({ message: t('common.success'), variant: 'success' });
                  refreshTable();
                } catch (err) {
                  showToast({ message: err.message, variant: 'error' });
                }
              }
            } },
          }),
        ],
      }));
    } catch (err) {
      tableContainer.innerHTML = '';
      showToast({ message: err.message, variant: 'error' });
    }
  };

  addBtn.addEventListener('click', async () => {
    try {
      const brands = await catalog.listBrands();
      openProductModal(null, brands, refreshTable);
    } catch (err) {
      showToast({ message: err.message, variant: 'error' });
    }
  });

  await refreshTable();
}

function formatPrice(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '٬').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]) + ' تومان';
}

/**
 * Open a modal for creating/editing a product.
 * @param {Object|null} product
 * @param {Object[]} brands
 * @param {() => void} onSaved
 */
async function openProductModal(product, brands, onSaved) {
  const isEdit = !!product;
  let variants = [];

  if (isEdit) {
    try {
      const full = await catalog.getProductBySlug(product.slug, { includeInactive: true });
      variants = full.variants || [];
    } catch (err) {
      showToast({ message: err.message, variant: 'error' });
    }
  }

  const form = renderProductForm(
    { product, variants, brands },
    async (payload) => {
      try {
        if (isEdit) {
          await catalog.updateProduct(product.id, {
            name: payload.name,
            brandId: payload.brandId,
            shortDescription: payload.shortDescription,
            basePrice: payload.basePrice,
            isFeatured: payload.isFeatured,
          });
          for (const v of payload.variants) {
            if (v.id) {
              await catalog.updateVariant(v.id, v);
            } else {
              await catalog.createVariant({ ...v, productId: product.id });
            }
          }
        } else {
          const newProduct = await catalog.createProduct({
            name: payload.name,
            brandId: payload.brandId,
            shortDescription: payload.shortDescription,
            basePrice: payload.basePrice,
            isFeatured: payload.isFeatured,
          });
          for (const v of payload.variants) {
            await catalog.createVariant({ ...v, productId: newProduct.id });
          }
        }
        showToast({ message: t('admin.saved'), variant: 'success' });
        modal.close();
        if (onSaved) onSaved();
      } catch (err) {
        showToast({ message: err.message, variant: 'error' });
      }
    }
  );

  const modal = showModal({
    title: isEdit ? t('admin.editProduct') : t('admin.addProduct'),
    body: form,
    size: 'lg',
  });
}

// ===== SECTION 4: Banners Page =====

/**
 * Render the banners management page.
 */
async function renderBannersPage() {
  const content = createEl('div', { className: 'stack' });

  const header = createEl('div', { className: 'row row--between' });
  header.appendChild(createEl('h1', { textContent: t('admin.banners') }));
  const addBtn = createEl('button', {
    className: 'btn btn--primary',
    textContent: '+ ' + (t('admin.addBanner') || 'Add Banner'),
    attrs: { type: 'button' },
  });
  header.appendChild(addBtn);
  content.appendChild(header);

  const tableContainer = createEl('div');
  tableContainer.appendChild(renderDataTable({
    columns: ['Title', 'Position', 'Status'],
    rows: [],
    renderCells: () => [],
    isLoading: true,
  }));
  content.appendChild(tableContainer);

  const { root } = renderAdminLayout('banners', content);
  document.body.innerHTML = '';
  document.body.appendChild(root);

  const refreshTable = async () => {
    tableContainer.innerHTML = '';
    tableContainer.appendChild(renderDataTable({
      columns: ['Title', 'Position', 'Status'],
      rows: [],
      renderCells: () => [],
      isLoading: true,
    }));

    try {
      const banners = await shopping.listAllBanners();

      tableContainer.innerHTML = '';
      tableContainer.appendChild(renderDataTable({
        columns: [t('common.title') || 'Title', 'Position', t('admin.status.active') || 'Status'],
        rows: banners,
        renderCells: (b) => [
          createEl('span', { textContent: b.title }),
          createEl('span', { textContent: toPersianDigits(String(b.position)) }),
          createEl('span', {
            className: `badge ${b.isActive ? 'badge--success' : 'badge--neutral'}`,
            textContent: b.isActive ? (t('admin.status.active') || 'Active') : (t('admin.status.inactive') || 'Inactive'),
          }),
        ],
        renderActions: (b) => [
          createEl('button', {
            className: 'btn btn--danger btn--sm',
            textContent: t('common.delete'),
            attrs: { type: 'button' },
            on: { click: async () => {
              const confirmed = await showConfirmDialog({
                title: t('common.delete'),
                message: t('admin.confirmDelete'),
                confirmVariant: 'danger',
              });
              if (confirmed) {
                try {
                  await shopping.deleteBanner(b.id);
                  showToast({ message: t('common.success'), variant: 'success' });
                  refreshTable();
                } catch (err) {
                  showToast({ message: err.message, variant: 'error' });
                }
              }
            } },
          }),
        ],
      }));
    } catch (err) {
      tableContainer.innerHTML = '';
      showToast({ message: err.message, variant: 'error' });
    }
  };

  addBtn.addEventListener('click', () => {
    const form = createEl('form', { className: 'form' });

    const titleField = createEl('div', { className: 'form-control' });
    titleField.appendChild(createEl('label', { className: 'form-label', textContent: t('common.title') || 'Title' }));
    const titleInput = createEl('input', { className: 'input', attrs: { type: 'text', required: '' } });
    titleField.appendChild(titleInput);
    form.appendChild(titleField);

    const posField = createEl('div', { className: 'form-control' });
    posField.appendChild(createEl('label', { className: 'form-label', textContent: 'Position' }));
    const posInput = createEl('input', { className: 'input', attrs: { type: 'number', value: '0' } });
    posField.appendChild(posInput);
    form.appendChild(posField);

    const actions = createEl('div', { className: 'form-actions' });
    actions.appendChild(createEl('button', {
      className: 'btn btn--primary',
      textContent: t('common.save'),
      attrs: { type: 'submit' },
    }));
    form.appendChild(actions);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await shopping.createBanner({
          title: titleInput.value,
          position: Number(posInput.value),
        });
        showToast({ message: t('admin.saved'), variant: 'success' });
        modal.close();
        refreshTable();
      } catch (err) {
        showToast({ message: err.message, variant: 'error' });
      }
    });

    const modal = showModal({
      title: t('admin.addBanner') || 'Add Banner',
      body: form,
    });
  });

  await refreshTable();
}

// ===== SECTION 5: Settings Page =====

/**
 * Render the site settings page.
 */
async function renderSettingsPage() {
  const content = createEl('div', { className: 'stack' });
  content.appendChild(createEl('h1', { textContent: t('admin.settings') }));

  const formContainer = createEl('div');
  formContainer.appendChild(createEl('div', { className: 'skeleton skeleton--block' }));
  content.appendChild(formContainer);

  const { root } = renderAdminLayout('settings', content);
  document.body.innerHTML = '';
  document.body.appendChild(root);

  try {
    const settings = await shopping.getSiteSettings();
    let currentLogoUrl = settings.logoUrl;

    formContainer.innerHTML = '';

    // Logo uploader
    const logoSection = createEl('div', { className: 'form-control' });
    logoSection.appendChild(createEl('label', { className: 'form-label', textContent: t('admin.siteLogo') || 'Site Logo' }));
    let uploader = renderImageUploader({
      currentUrl: currentLogoUrl,
      aspectRatio: '4/1',
      onUpload: async (file) => {
        try {
          const result = await shopping.uploadImage({
            bucket: 'brands',
            path: `logo/${Date.now()}-${file.name}`,
            file,
            optimize: true,
            upsert: false,
          });
          currentLogoUrl = result.publicUrl;
          logoSection.replaceChild(
            renderImageUploader({
              currentUrl: currentLogoUrl,
              aspectRatio: '4/1',
              onUpload: arguments.callee,
              onRemove: () => { currentLogoUrl = null; refreshUploader(); },
            }),
            uploader
          );
          showToast({ message: t('admin.saved'), variant: 'success' });
        } catch (err) {
          showToast({ message: err.message, variant: 'error' });
        }
      },
      onRemove: () => { currentLogoUrl = null; refreshUploader(); },
    });
    logoSection.appendChild(uploader);

    const refreshUploader = () => {
      logoSection.innerHTML = '';
      logoSection.appendChild(createEl('label', { className: 'form-label', textContent: t('admin.siteLogo') || 'Site Logo' }));
      uploader = renderImageUploader({
        currentUrl: currentLogoUrl,
        aspectRatio: '4/1',
        onUpload: async (file) => {
          try {
            const result = await shopping.uploadImage({
              bucket: 'brands',
              path: `logo/${Date.now()}-${file.name}`,
              file,
              optimize: true,
            });
            currentLogoUrl = result.publicUrl;
            refreshUploader();
            showToast({ message: t('admin.saved'), variant: 'success' });
          } catch (err) {
            showToast({ message: err.message, variant: 'error' });
          }
        },
        onRemove: () => { currentLogoUrl = null; refreshUploader(); },
      });
      logoSection.appendChild(uploader);
    };

    formContainer.appendChild(logoSection);

    // Settings form
    const form = renderSettingsForm(settings, async (data) => {
      try {
        await shopping.updateSiteSettings({ ...data, logoUrl: currentLogoUrl });
        showToast({ message: t('admin.settingsSaved'), variant: 'success' });
      } catch (err) {
        showToast({ message: err.message, variant: 'error' });
      }
    });
    formContainer.appendChild(form);
  } catch (err) {
    formContainer.innerHTML = '';
    showToast({ message: err.message, variant: 'error' });
  }
}
