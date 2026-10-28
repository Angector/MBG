// === FILE: src/pages/admin.js ===
// Project: Mobogram — Phase 13: Admin Pages
// Purpose: Orchestrate admin pages (dashboard, products, banners, settings)

// ===== SECTION 0: Imports =====
import { ROUTES, supabase } from '../config.js';
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

  // Sales chart
  const chartSection = createEl('div', { className: 'stack' });
  chartSection.style.marginBlockStart = 'var(--space-8)';
  chartSection.style.padding = 'var(--space-5)';
  chartSection.style.background = 'var(--color-surface)';
  chartSection.style.borderRadius = 'var(--radius-lg)';
  chartSection.style.boxShadow = 'var(--shadow-card)';

  chartSection.appendChild(createEl('h2', { 
    textContent: t('admin.salesChart') || 'نمودار فروش ۷ روز اخیر',
    attrs: { style: 'margin: 0 0 var(--space-4); font-size: var(--text-xl);' }
  }));

  const canvas = createEl('canvas', {
    attrs: {
      id: 'sales-chart',
      width: '800',
      height: '400',
      style: 'width: 100%; height: auto; max-height: 400px;'
    }
  });
  chartSection.appendChild(canvas);

  content.appendChild(chartSection);

  // Draw mock sales data
  setTimeout(() => {
    const mockData = [
      { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), total: 15000000 },
      { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), total: 23000000 },
      { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), total: 18000000 },
      { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), total: 32000000 },
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), total: 28000000 },
      { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), total: 41000000 },
      { date: new Date().toISOString(), total: 35000000 },
    ];
    drawSalesChart(canvas, mockData);
  }, 100);
}

function toPersianDigits(str) {
  return String(str).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

// ===== SECTION 2.5: Charts & Export Helpers =====

/**
 * Draw a sales chart on a canvas element.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{date: string, total: number}>} data
 */
function drawSalesChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = 40;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  if (!data || data.length === 0) {
    ctx.fillStyle = '#777783';
    ctx.font = '14px Tahoma';
    ctx.textAlign = 'center';
    ctx.fillText('داده‌ای موجود نیست', width / 2, height / 2);
    return;
  }

  // Calculate scales
  const maxTotal = Math.max(...data.map(d => d.total));
  const barWidth = (width - padding * 2) / data.length;
  const barSpacing = barWidth * 0.2;

  // Draw bars
  data.forEach((item, index) => {
    const x = padding + index * barWidth + barSpacing / 2;
    const barHeight = (item.total / maxTotal) * (height - padding * 2);
    const y = height - padding - barHeight;

    // Bar gradient
    const gradient = ctx.createLinearGradient(x, y, x, height - padding);
    gradient.addColorStop(0, '#FF5548');
    gradient.addColorStop(1, '#E8463A');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth - barSpacing, barHeight);

    // Date label
    ctx.fillStyle = '#777783';
    ctx.font = '10px Tahoma';
    ctx.textAlign = 'center';
    const date = new Date(item.date);
    ctx.fillText(`${date.getMonth() + 1}/${date.getDate()}`, x + (barWidth - barSpacing) / 2, height - padding + 15);

    // Value label
    ctx.fillStyle = '#302D43';
    ctx.font = '11px Tahoma';
    ctx.fillText(toPersianDigits(Math.round(item.total / 1000)) + 'k', x + (barWidth - barSpacing) / 2, y - 5);
  });

  // Draw axes
  ctx.strokeStyle = '#E4E6EE';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
}

/**
 * Export data to CSV file.
 * @param {Array<Object>} data
 * @param {string} filename
 */
function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    showToast({ message: t('admin.noDataToExport') || 'داده‌ای برای خروجی وجود ندارد', variant: 'warning' });
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(value || '').replace(/"/g, '""');
      return escaped.includes(',') ? `"${escaped}"` : escaped;
    }).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  showToast({ message: t('admin.exportSuccess') || 'فایل با موفقیت دانلود شد', variant: 'success' });
}

// ===== SECTION 3: Products Page =====

/**
 * Render the products management page.
 */
async function renderProductsPage() {
  const content = createEl('div', { className: 'stack' });

  const header = createEl('div', { className: 'row row--between' });
  header.appendChild(createEl('h1', { textContent: t('admin.products') }));
  
  const headerActions = createEl('div', { className: 'row' });
  
  // Export CSV button
  const exportBtn = createEl('button', {
    className: 'btn btn--secondary',
    textContent: t('admin.exportCSV') || 'خروجی CSV',
    attrs: { type: 'button' },
  });
  headerActions.appendChild(exportBtn);
  
  const addBtn = createEl('button', {
    className: 'btn btn--primary',
    textContent: '+ ' + t('admin.addProduct'),
    attrs: { type: 'button' },
  });
  headerActions.appendChild(addBtn);
  
  header.appendChild(headerActions);
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

  // Export CSV button
  exportBtn.addEventListener('click', async () => {
    try {
      const { items } = await catalog.listProducts({ pageSize: 1000 });
      const exportData = items.map(p => ({
        name: p.name,
        brand: p.brand?.name || '',
        price: p.basePrice,
        stock: p.variants?.reduce((s, v) => s + v.stock, 0) || 0,
        slug: p.slug,
        is_active: p.isActive ? 'فعال' : 'غیرفعال',
        is_featured: p.isFeatured ? 'بله' : 'خیر',
      }));
      exportToCSV(exportData, 'products');
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

    // Maintenance mode checkbox
    const maintenanceSection = createEl('div', { className: 'form-control' });
    maintenanceSection.style.marginBlock = 'var(--space-6)';
    maintenanceSection.style.padding = 'var(--space-4)';
    maintenanceSection.style.background = 'var(--color-warning-soft)';
    maintenanceSection.style.borderRadius = 'var(--radius-md)';
    maintenanceSection.style.borderRight = '4px solid var(--color-warning)';
    
    const maintenanceLabel = createEl('label', { className: 'check' });
    const maintenanceCheckbox = createEl('input', {
      attrs: { type: 'checkbox', id: 'maintenance-mode' },
    });
    
    // Load current maintenance mode setting
    try {
      const { data: maintenanceData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();
      
      if (maintenanceData?.value === true) {
        maintenanceCheckbox.checked = true;
      }
    } catch (err) {
      // Setting doesn't exist yet, that's okay
    }
    
    maintenanceLabel.appendChild(maintenanceCheckbox);
    maintenanceLabel.appendChild(createEl('span', { 
      textContent: t('admin.maintenanceMode') || 'حالت تعمیرات',
      attrs: { style: 'font-weight: var(--weight-semibold);' }
    }));
    maintenanceSection.appendChild(maintenanceLabel);
    
    const maintenanceDesc = createEl('p', {
      className: 'text-muted',
      textContent: t('admin.maintenanceModeDesc') || 'با فعال کردن این گزینه، سایت به حالت تعمیرات می‌رود و کاربران عادی نمی‌توانند وارد شوند.',
    });
    maintenanceDesc.style.marginBlockStart = 'var(--space-2)';
    maintenanceDesc.style.fontSize = 'var(--text-sm)';
    maintenanceSection.appendChild(maintenanceDesc);
    
    formContainer.appendChild(maintenanceSection);

    // Settings form
    const form = renderSettingsForm(settings, async (data) => {
      try {
        // Save maintenance mode setting
        const maintenanceMode = maintenanceCheckbox.checked;
        await supabase
          .from('site_settings')
          .upsert({ key: 'maintenance_mode', value: maintenanceMode });
        
        await shopping.updateSiteSettings({ ...data, logoUrl: currentLogoUrl });
        showToast({ message: t('admin.settingsSaved'), variant: 'success' });
        
        if (maintenanceMode) {
          showToast({ 
            message: t('admin.maintenanceEnabled') || 'حالت تعمیرات فعال شد. کاربران عادی نمی‌توانند وارد سایت شوند.',
            variant: 'warning',
            duration: 5000,
          });
        }
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
