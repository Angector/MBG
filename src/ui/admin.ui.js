// === FILE: src/ui/admin.ui.js ===
// Project: Mobogram — Phase 13: Admin UI
// Purpose: Reusable DOM components for the admin panel

// ===== SECTION 0: Imports & Setup =====
import { ROUTES, UPLOAD } from '../config.js';
import { t } from '../i18n.js';
import {
  createEl, escapeHtml, show, hide, formatPrice,
  formatDate, toPersianDigits,
} from '../utils.js';
import { renderImage, renderSkeleton, renderEmptyState, showToast } from './primitives.js';

// ===== SECTION 1: Admin Layout & Sidebar =====

const SIDEBAR_ITEMS = [
  { key: 'dashboard', label: 'admin.dashboard', href: ROUTES.adminDashboard },
  { key: 'products', label: 'admin.products', href: ROUTES.adminProducts },
  { key: 'banners', label: 'admin.banners', href: ROUTES.adminBanners },
  { key: 'settings', label: 'admin.settings', href: ROUTES.adminSettings },
];

/**
 * Render the admin layout with sidebar and main content area.
 * @param {string} activePage - 'dashboard'|'products'|'banners'|'settings'
 * @param {HTMLElement} contentEl - content for the main area
 * @returns {{ root: HTMLElement, main: HTMLElement }}
 * @example
 *   const { root } = renderAdminLayout('products', tableEl);
 *   document.body.appendChild(root);
 */
export function renderAdminLayout(activePage, contentEl) {
  const root = createEl('div', { className: 'admin-layout' });
  root.style.display = 'flex';
  root.style.minHeight = '100vh';

  // Sidebar
  const sidebar = createEl('aside', { className: 'admin-sidebar' });
  sidebar.style.width = '240px';
  sidebar.style.background = 'var(--color-surface)';
  sidebar.style.borderInlineEnd = '1px solid var(--color-border)';
  sidebar.style.padding = 'var(--space-4)';
  sidebar.style.display = 'flex';
  sidebar.style.flexDirection = 'column';

  // Brand
  const brand = createEl('div', {
    className: 'admin-sidebar__brand',
    textContent: t('site.brandName'),
  });
  brand.style.fontSize = 'var(--text-xl)';
  brand.style.fontWeight = 'var(--weight-bold)';
  brand.style.marginBlockEnd = 'var(--space-6)';
  brand.style.paddingInline = 'var(--space-2)';
  sidebar.appendChild(brand);

  // Nav
  const nav = createEl('nav', { className: 'admin-sidebar__nav stack stack--tight' });
  SIDEBAR_ITEMS.forEach((item) => {
    const link = createEl('a', {
      className: `admin-sidebar__link ${item.key === activePage ? 'is-active' : ''}`,
      textContent: t(item.label),
      attrs: { href: item.href },
    });
    link.style.display = 'block';
    link.style.padding = 'var(--space-2) var(--space-3)';
    link.style.borderRadius = 'var(--radius-sm)';
    link.style.textDecoration = 'none';
    link.style.color = item.key === activePage ? 'var(--color-on-accent)' : 'var(--color-text)';
    link.style.background = item.key === activePage ? 'var(--color-accent)' : 'transparent';
    nav.appendChild(link);
  });
  sidebar.appendChild(nav);

  // Back to store link
  const backLink = createEl('a', {
    className: 'admin-sidebar__back',
    textContent: t('common.back') + ' → ' + t('site.brandName'),
    attrs: { href: ROUTES.home },
  });
  backLink.style.marginBlockStart = 'auto';
  backLink.style.padding = 'var(--space-2) var(--space-3)';
  backLink.style.color = 'var(--color-text-muted)';
  backLink.style.fontSize = 'var(--text-sm)';
  sidebar.appendChild(backLink);

  // Sign out button
  const signOutBtn = createEl('button', {
    className: 'btn btn--ghost btn--block',
    textContent: t('nav.logout'),
    attrs: { type: 'button' },
    on: {
      click: async () => {
        try {
          const { signOut } = await import('../services/auth.service.js');
          await signOut();
          window.location.href = ROUTES.auth;
        } catch (err) {
          showToast({ message: err.message, variant: 'error' });
        }
      },
    },
  });
  signOutBtn.style.marginBlockStart = 'var(--space-2)';
  sidebar.appendChild(signOutBtn);

  root.appendChild(sidebar);

  // Main
  const main = createEl('main', { className: 'admin-main' });
  main.style.flex = '1';
  main.style.padding = 'var(--space-6)';
  main.style.background = 'var(--color-bg)';
  main.style.overflowY = 'auto';
  if (contentEl) main.appendChild(contentEl);
  root.appendChild(main);

  return { root, main };
}

// ===== SECTION 2: Data Table =====

/**
 * Render a responsive data table for admin lists.
 * @param {Object} options
 * @param {string[]} options.columns - column headers
 * @param {Array<Object>} options.rows - data rows
 * @param {(row: any) => HTMLElement[]} options.renderCells - render td content per column
 * @param {(row: any) => HTMLElement[]} [options.renderActions] - render action buttons
 * @param {boolean} [options.isLoading=false]
 * @param {string} [options.emptyMessage]
 * @param {string} [options.emptyTitle]
 * @returns {HTMLElement}
 * @example
 *   const table = renderDataTable({
 *     columns: ['Name', 'Price', 'Actions'],
 *     rows: products,
 *     renderCells: (p) => [
 *       createEl('span', { textContent: p.name }),
 *       createEl('span', { textContent: formatPrice(p.basePrice) }),
 *     ],
 *     renderActions: (p) => [editBtn, deleteBtn],
 *   });
 */
export function renderDataTable(options) {
  const {
    columns, rows, renderCells, renderActions,
    isLoading = false, emptyMessage, emptyTitle,
  } = options;

  if (isLoading) {
    const wrap = createEl('div', { className: 'table-wrap' });
    const table = createEl('table', { className: 'table' });
    const thead = createEl('thead');
    const headerRow = createEl('tr');
    columns.forEach((col) => {
      headerRow.appendChild(createEl('th', { textContent: col }));
    });
    if (renderActions) headerRow.appendChild(createEl('th', { textContent: '' }));
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = createEl('tbody');
    for (let i = 0; i < 5; i++) {
      const tr = createEl('tr');
      columns.forEach(() => {
        const td = createEl('td');
        td.appendChild(renderSkeleton({ variant: 'text' }));
        tr.appendChild(td);
      });
      if (renderActions) {
        const td = createEl('td');
        td.appendChild(renderSkeleton({ variant: 'text', width: '80px' }));
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  if (!rows || rows.length === 0) {
    return renderEmptyState({
      title: emptyTitle || t('common.noResults'),
      description: emptyMessage || '',
      icon: 'box',
    });
  }

  const wrap = createEl('div', { className: 'table-wrap' });
  const table = createEl('table', { className: 'table' });

  const thead = createEl('thead');
  const headerRow = createEl('tr');
  columns.forEach((col) => {
    headerRow.appendChild(createEl('th', { textContent: col }));
  });
  if (renderActions) headerRow.appendChild(createEl('th', { textContent: '' }));
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = createEl('tbody');
  rows.forEach((row) => {
    const tr = createEl('tr');
    const cells = renderCells(row);
    cells.forEach((cell) => {
      const td = createEl('td');
      td.appendChild(cell);
      tr.appendChild(td);
    });
    if (renderActions) {
      const td = createEl('td');
      const actionsWrap = createEl('div', { className: 'table__actions' });
      renderActions(row).forEach((btn) => actionsWrap.appendChild(btn));
      td.appendChild(actionsWrap);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);

  return wrap;
}

// ===== SECTION 3: Image Uploader =====

/**
 * Render a drag-and-drop image uploader with preview.
 * @param {Object} options
 * @param {string|null} options.currentUrl - existing image URL
 * @param {string} [options.aspectRatio='1/1']
 * @param {(file: File) => void} options.onUpload
 * @param {() => void} [options.onRemove]
 * @returns {HTMLElement}
 * @example
 *   const uploader = renderImageUploader({
 *     currentUrl: product.images[0],
 *     onUpload: (file) => handleUpload(file),
 *     onRemove: () => removeImage(),
 *   });
 */
export function renderImageUploader(options) {
  const { currentUrl, aspectRatio = '1/1', onUpload, onRemove } = options;
  const container = createEl('div', { className: 'uploader' });
  container.style.position = 'relative';
  container.style.aspectRatio = aspectRatio;
  container.style.borderRadius = 'var(--radius-lg)';
  container.style.overflow = 'hidden';

  const fileInput = createEl('input', {
    attrs: { type: 'file', accept: UPLOAD.acceptedMimeTypes.join(','), hidden: '' },
  });

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > UPLOAD.maxSizeBytes) {
      showToast({ title: t('common.error'), message: `Max ${UPLOAD.maxSizeLabel}`, variant: 'error' });
      return;
    }
    if (!UPLOAD.acceptedMimeTypes.includes(file.type)) {
      showToast({ title: t('common.error'), message: 'Invalid file type', variant: 'error' });
      return;
    }
    if (onUpload) onUpload(file);
  };

  fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files?.[0]);
  });

  if (currentUrl) {
    const img = renderImage({ url: currentUrl, alt: 'Current image', aspectRatio });
    img.style.width = '100%';
    img.style.height = '100%';
    container.appendChild(img);

    if (onRemove) {
      const removeBtn = createEl('button', {
        className: 'uploader__remove',
        textContent: '×',
        attrs: { 'aria-label': t('admin.removeImage') },
        on: { click: () => onRemove() },
      });
      removeBtn.style.position = 'absolute';
      removeBtn.style.insetBlockStart = 'var(--space-2)';
      removeBtn.style.insetInlineEnd = 'var(--space-2)';
      removeBtn.style.width = '32px';
      removeBtn.style.height = '32px';
      removeBtn.style.borderRadius = 'var(--radius-full)';
      removeBtn.style.background = 'rgba(0,0,0,0.6)';
      removeBtn.style.color = 'white';
      removeBtn.style.border = '0';
      removeBtn.style.cursor = 'pointer';
      removeBtn.style.fontSize = 'var(--text-lg)';
      container.appendChild(removeBtn);
    }
  } else {
    const dropZone = createEl('div', { className: 'uploader__dropzone' });
    dropZone.style.width = '100%';
    dropZone.style.height = '100%';
    dropZone.style.border = '2px dashed var(--color-border-strong)';
    dropZone.style.borderRadius = 'var(--radius-lg)';
    dropZone.style.display = 'flex';
    dropZone.style.flexDirection = 'column';
    dropZone.style.alignItems = 'center';
    dropZone.style.justifyContent = 'center';
    dropZone.style.cursor = 'pointer';
    dropZone.style.gap = 'var(--space-2)';
    dropZone.style.color = 'var(--color-text-muted)';
    dropZone.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
      </svg>
      <span>${t('admin.uploadImage') || 'Drag & Drop or Click'}</span>
    `;
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--color-accent)'; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--color-border-strong)'; });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--color-border-strong)';
      handleFile(e.dataTransfer.files?.[0]);
    });
    container.appendChild(dropZone);
  }

  container.appendChild(fileInput);
  return container;
}

// ===== SECTION 4: Admin Forms =====

/**
 * Render a product form for create/edit.
 * @param {Object} data
 * @param {Object|null} data.product
 * @param {Object[]} data.variants
 * @param {Object[]} data.brands
 * @param {(payload: Object) => void} onSubmit
 * @returns {HTMLElement}
 */
export function renderProductForm(data, onSubmit) {
  const { product, variants = [], brands } = data;
  const form = createEl('form', { className: 'form' });

  // Name
  const nameField = createEl('div', { className: 'form-control' });
  nameField.appendChild(createEl('label', { className: 'form-label', textContent: t('product.name') || 'Name' }));
  const nameInput = createEl('input', {
    className: 'input',
    attrs: { type: 'text', value: product?.name || '', required: '' },
  });
  nameField.appendChild(nameInput);
  form.appendChild(nameField);

  // Brand
  const brandField = createEl('div', { className: 'form-control' });
  brandField.appendChild(createEl('label', { className: 'form-label', textContent: t('product.brand') }));
  const brandSelect = createEl('select', { className: 'input' });
  (brands || []).forEach((b) => {
    const opt = createEl('option', { textContent: b.name, attrs: { value: b.id } });
    if (product?.brandId === b.id) opt.selected = true;
    brandSelect.appendChild(opt);
  });
  brandField.appendChild(brandSelect);
  form.appendChild(brandField);

  // Short description
  const shortDescField = createEl('div', { className: 'form-control' });
  shortDescField.appendChild(createEl('label', { className: 'form-label', textContent: t('product.shortDescription') || 'Short Description' }));
  const shortDescInput = createEl('textarea', {
    className: 'input',
    textContent: product?.shortDescription || '',
    attrs: { rows: '2' },
  });
  shortDescField.appendChild(shortDescInput);
  form.appendChild(shortDescField);

  // Base price
  const priceField = createEl('div', { className: 'form-control' });
  priceField.appendChild(createEl('label', { className: 'form-label', textContent: t('product.price') }));
  const priceInput = createEl('input', {
    className: 'input',
    attrs: { type: 'number', value: product?.basePrice || '', min: '0' },
  });
  priceField.appendChild(priceInput);
  form.appendChild(priceField);

  // Featured checkbox
  const featuredField = createEl('div', { className: 'form-control' });
  const featuredLabel = createEl('label', { className: 'check' });
  const featuredCheck = createEl('input', { attrs: { type: 'checkbox' } });
  if (product?.isFeatured) featuredCheck.checked = true;
  featuredLabel.appendChild(featuredCheck);
  featuredLabel.appendChild(createEl('span', { textContent: t('product.featured') || 'Featured' }));
  featuredField.appendChild(featuredLabel);
  form.appendChild(featuredField);

  // Variant editor
  let currentVariants = [...variants];
  const variantEditor = renderVariantEditor(currentVariants, (updated) => {
    currentVariants = updated;
  });
  form.appendChild(variantEditor);

  // Submit
  const actions = createEl('div', { className: 'form-actions' });
  actions.appendChild(createEl('button', {
    className: 'btn btn--primary',
    textContent: t('common.save'),
    attrs: { type: 'submit' },
  }));
  form.appendChild(actions);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        name: nameInput.value,
        brandId: brandSelect.value,
        shortDescription: shortDescInput.value,
        basePrice: Number(priceInput.value),
        isFeatured: featuredCheck.checked,
        variants: currentVariants,
      });
    }
  });

  return form;
}

/**
 * Render the variant editor table within the product form.
 * @param {Object[]} initialVariants
 * @param {(variants: Object[]) => void} onChange
 * @returns {HTMLElement}
 */
export function renderVariantEditor(initialVariants, onChange) {
  let variants = [...initialVariants];
  const container = createEl('div', { className: 'variant-editor' });

  const render = () => {
    container.innerHTML = '';
    const label = createEl('div', {
      className: 'form-label',
      textContent: t('admin.variants') || 'Variants',
    });
    label.style.marginBlockEnd = 'var(--space-2)';
    container.appendChild(label);

    if (variants.length === 0) {
      container.appendChild(createEl('p', {
        className: 'text-muted',
        textContent: t('admin.noVariants') || 'No variants yet',
      }));
    } else {
      const table = createEl('div', { className: 'stack stack--tight' });
      variants.forEach((v, idx) => {
        const row = createEl('div', { className: 'row' });
        row.style.gap = 'var(--space-2)';
        row.style.alignItems = 'center';
        row.style.padding = 'var(--space-2)';
        row.style.background = 'var(--color-surface-2)';
        row.style.borderRadius = 'var(--radius-sm)';

        const storageInput = createEl('input', {
          className: 'input input--sm',
          attrs: { type: 'text', value: v.storage || '', placeholder: 'Storage' },
          on: { input: (e) => { variants[idx].storage = e.target.value; onChange(variants); } },
        });
        storageInput.style.flex = '1';

        const colorInput = createEl('input', {
          className: 'input input--sm',
          attrs: { type: 'text', value: v.color || '', placeholder: 'Color' },
          on: { input: (e) => { variants[idx].color = e.target.value; onChange(variants); } },
        });
        colorInput.style.flex = '1';

        const priceInput = createEl('input', {
          className: 'input input--sm',
          attrs: { type: 'number', value: v.price || '', placeholder: 'Price', min: '0' },
          on: { input: (e) => { variants[idx].price = Number(e.target.value); onChange(variants); } },
        });
        priceInput.style.width = '120px';

        const stockInput = createEl('input', {
          className: 'input input--sm',
          attrs: { type: 'number', value: v.stock ?? 0, placeholder: 'Stock', min: '0' },
          on: { input: (e) => { variants[idx].stock = Number(e.target.value); onChange(variants); } },
        });
        stockInput.style.width = '80px';

        const removeBtn = createEl('button', {
          className: 'btn btn--ghost btn--sm',
          textContent: '×',
          attrs: { 'aria-label': t('admin.removeVariant') || 'Remove', type: 'button' },
          on: { click: () => { variants.splice(idx, 1); onChange(variants); render(); } },
        });

        row.append(storageInput, colorInput, priceInput, stockInput, removeBtn);
        table.appendChild(row);
      });
      container.appendChild(table);
    }

    const addBtn = createEl('button', {
      className: 'btn btn--secondary btn--sm',
      textContent: '+ ' + (t('admin.addVariant') || 'Add Variant'),
      attrs: { type: 'button' },
      on: {
        click: () => {
          variants.push({ storage: '', color: '', price: 0, stock: 0 });
          onChange(variants);
          render();
        },
      },
    });
    addBtn.style.marginBlockStart = 'var(--space-2)';
    container.appendChild(addBtn);
  };

  render();
  return container;
}

/**
 * Render a simple form for brands.
 * @param {Object} initialData
 * @param {(data: Object) => void} onSubmit
 * @returns {HTMLElement}
 */
export function renderBrandForm(initialData, onSubmit) {
  const form = createEl('form', { className: 'form' });

  const nameField = createEl('div', { className: 'form-control' });
  nameField.appendChild(createEl('label', { className: 'form-label', textContent: t('admin.brandName') || 'Brand Name' }));
  const nameInput = createEl('input', {
    className: 'input',
    attrs: { type: 'text', value: initialData?.name || '', required: '' },
  });
  nameField.appendChild(nameInput);
  form.appendChild(nameField);

  const actions = createEl('div', { className: 'form-actions' });
  actions.appendChild(createEl('button', {
    className: 'btn btn--primary',
    textContent: t('common.save'),
    attrs: { type: 'submit' },
  }));
  form.appendChild(actions);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit({ name: nameInput.value });
  });

  return form;
}

/**
 * Render a form for site settings.
 * @param {Object} settings
 * @param {(data: Object) => void} onSubmit
 * @returns {HTMLElement}
 */
export function renderSettingsForm(settings, onSubmit) {
  const form = createEl('form', { className: 'form' });

  const fields = [
    { key: 'brandName', label: t('admin.brandName') || 'Brand Name' },
    { key: 'supportEmail', label: t('admin.supportEmail') || 'Support Email' },
    { key: 'supportPhone', label: t('admin.supportPhone') || 'Support Phone' },
  ];

  const inputs = {};
  fields.forEach(({ key, label }) => {
    const field = createEl('div', { className: 'form-control' });
    field.appendChild(createEl('label', { className: 'form-label', textContent: label }));
    const input = createEl('input', {
      className: 'input',
      attrs: { type: 'text', value: settings?.[key] || '' },
    });
    inputs[key] = input;
    field.appendChild(input);
    form.appendChild(field);
  });

  const actions = createEl('div', { className: 'form-actions' });
  actions.appendChild(createEl('button', {
    className: 'btn btn--primary',
    textContent: t('common.save'),
    attrs: { type: 'submit' },
  }));
  form.appendChild(actions);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (onSubmit) {
      const data = {};
      for (const key of Object.keys(inputs)) data[key] = inputs[key].value;
      onSubmit(data);
    }
  });

  return form;
}
