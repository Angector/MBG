// === FILE: src/types.js ===
// Project: Mobogram — Phase 5: JavaScript Substrate
// Purpose: JSDoc type definitions ONLY — zero runtime code, documentation only

// ===== SECTION: Identity & Auth =====

/**
 * @typedef {Object} User
 * @property {string} id - UUID from auth.users
 * @property {string} email - User email address
 * @property {string|null} emailConfirmedAt - ISO date when email was confirmed
 * @property {string} createdAt - ISO date of account creation
 */

/**
 * @typedef {Object} Profile
 * @property {string} id - UUID matching auth.users.id
 * @property {string} fullName - User's full name
 * @property {'customer'|'admin'} role - User role
 * @property {string} createdAt - ISO date of profile creation
 * @property {string} updatedAt - ISO date of last profile update
 */

/**
 * @typedef {Object} AuthSession
 * @property {User} user - Authenticated user
 * @property {number} expiresAt - Unix timestamp (seconds) when session expires
 */

// ===== SECTION: Catalog =====

/**
 * @typedef {Object} Brand
 * @property {string} id - Brand UUID
 * @property {string} name - Brand name (e.g., "سامسونگ")
 * @property {string} slug - URL-friendly brand identifier
 * @property {string|null} logoUrl - Logo image URL (null → checkerboard placeholder)
 * @property {string} createdAt - ISO date of creation
 * @property {string} updatedAt - ISO date of last update
 */

/**
 * @typedef {Object} Product
 * @property {string} id - Product UUID
 * @property {string} slug - URL-friendly product identifier
 * @property {string} name - Product name
 * @property {string} brandId - Associated brand UUID
 * @property {Brand|null} brand - Joined brand object (when service includes it)
 * @property {'phone'} category - Product category (always 'phone')
 * @property {string} shortDescription - Brief product description
 * @property {string} description - Full product description (HTML allowed)
 * @property {Object<string, string>} specs - Technical specifications (e.g., { screen: "6.7\"", battery: "5000mAh" })
 * @property {number} basePrice - Base price in Toman
 * @property {number|null} discountPrice - Discounted price in Toman (null if no discount)
 * @property {string[]} images - Ordered array of image URLs (may be empty)
 * @property {number|null} releaseYear - Year of release
 * @property {boolean} isFeatured - Whether product is featured on homepage
 * @property {boolean} isActive - Whether product is visible to customers
 * @property {string} createdAt - ISO date of creation
 * @property {string} updatedAt - ISO date of last update
 */

/**
 * @typedef {Object} ProductVariant
 * @property {string} id - Variant UUID
 * @property {string} productId - Parent product UUID
 * @property {string} storage - Storage capacity (e.g., "128GB", "256GB")
 * @property {string} color - Color name (e.g., "Titanium Blue")
 * @property {string|null} ram - RAM size (e.g., "8GB", null if not applicable)
 * @property {string} sku - Stock keeping unit (unique identifier)
 * @property {number} price - Price in Toman (overrides product.basePrice when present)
 * @property {number} stock - Available quantity
 * @property {boolean} isActive - Whether variant is purchasable
 * @property {string} createdAt - ISO date of creation
 * @property {string} updatedAt - ISO date of last update
 */

/**
 * @typedef {Object} ProductWithVariants
 * @property {string} id - Product UUID
 * @property {string} slug - URL-friendly product identifier
 * @property {string} name - Product name
 * @property {string} brandId - Associated brand UUID
 * @property {Brand|null} brand - Joined brand object
 * @property {'phone'} category - Product category
 * @property {string} shortDescription - Brief product description
 * @property {string} description - Full product description
 * @property {Object<string, string>} specs - Technical specifications
 * @property {number} basePrice - Base price in Toman
 * @property {number|null} discountPrice - Discounted price in Toman
 * @property {string[]} images - Ordered array of image URLs
 * @property {number|null} releaseYear - Year of release
 * @property {boolean} isFeatured - Whether product is featured
 * @property {boolean} isActive - Whether product is visible
 * @property {string} createdAt - ISO date of creation
 * @property {string} updatedAt - ISO date of last update
 * @property {ProductVariant[]} variants - Array of product variants
 */

// ===== SECTION: Cart & Wishlist =====

/**
 * @typedef {Object} CartItem
 * @property {string} variantId - Product variant UUID
 * @property {string} productId - Parent product UUID
 * @property {string} productSlug - Product slug for URL generation
 * @property {string} productName - Product name (snapshot at add time)
 * @property {string} brandName - Brand name (snapshot at add time)
 * @property {string|null} imageUrl - Product image URL (snapshot at add time)
 * @property {string} storage - Storage capacity
 * @property {string} color - Color name
 * @property {number} unitPrice - Price per unit in Toman
 * @property {number} qty - Quantity in cart
 * @property {number} addedAt - Unix timestamp (ms) when item was added
 * @property {number} updatedAt - Unix timestamp (ms) when item was last updated
 */

/**
 * @typedef {Object} Cart
 * @property {CartItem[]} items - Array of cart items
 * @property {number} version - Schema version (matches CART.schemaVersion)
 * @property {number} updatedAt - Unix timestamp (ms) of last cart update
 */

/**
 * @typedef {Object} WishlistEntry
 * @property {string} id - Wishlist entry UUID
 * @property {string} userId - User UUID
 * @property {string} productId - Product UUID
 * @property {string} createdAt - ISO date when product was added to wishlist
 * @property {Product|null} product - Joined product object (when fetched with join)
 */

// ===== SECTION: Orders =====

/**
 * @typedef {Object} Order
 * @property {string} id - Order UUID
 * @property {string} userId - User UUID who placed the order
 * @property {'pending'|'confirmed'|'shipped'|'delivered'|'cancelled'} status - Order status
 * @property {number} total - Total order amount in Toman
 * @property {Address} address - Shipping address
 * @property {string} customerName - Customer's full name
 * @property {string} customerPhone - Customer's phone number
 * @property {string|null} customerNote - Optional customer note
 * @property {string} createdAt - ISO date of order creation
 * @property {string} updatedAt - ISO date of last status update
 * @property {OrderItem[]} items - Array of order items
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} id - Order item UUID
 * @property {string} orderId - Parent order UUID
 * @property {string} variantId - Product variant UUID
 * @property {string} productId - Parent product UUID
 * @property {string} productName - Product name (snapshot at order time)
 * @property {string} storage - Storage capacity (snapshot at order time)
 * @property {string} color - Color name (snapshot at order time)
 * @property {number} unitPrice - Price per unit in Toman (snapshot at order time)
 * @property {number} qty - Quantity ordered
 * @property {Object} productSnapshot - Snapshot of product data at order time
 * @property {string} productSnapshot.name - Product name
 * @property {string} productSnapshot.brandName - Brand name
 * @property {string|null} productSnapshot.imageUrl - Product image URL
 */

/**
 * @typedef {Object} Address
 * @property {string} province - Province/state name
 * @property {string} city - City name
 * @property {string} street - Street address
 * @property {string} postalCode - Postal/ZIP code
 * @property {string|null} unit - Apartment/unit number (optional)
 */

// ===== SECTION: Banners & Settings =====

/**
 * @typedef {Object} Banner
 * @property {string} id - Banner UUID
 * @property {string} title - Banner headline
 * @property {string|null} subtitle - Banner subheading (optional)
 * @property {string|null} imageUrl - Banner image URL (null → placeholder)
 * @property {string|null} ctaLabel - Call-to-action button label (optional)
 * @property {string|null} ctaLink - Call-to-action button URL (optional)
 * @property {number} position - Display order (lower = first)
 * @property {boolean} isActive - Whether banner is visible
 * @property {string|null} startsAt - ISO date when banner becomes active (optional)
 * @property {string|null} endsAt - ISO date when banner expires (optional)
 * @property {string} createdAt - ISO date of creation
 * @property {string} updatedAt - ISO date of last update
 */

/**
 * @typedef {Object} SiteSettings
 * @property {string} brandName - Site brand name (e.g., "موبوگرام")
 * @property {string|null} logoUrl - Site logo URL (null → text logo)
 * @property {'fa'} defaultLocale - Default locale (currently only 'fa')
 * @property {string|null} supportEmail - Support email address
 * @property {string|null} supportPhone - Support phone number
 */

// ===== SECTION: Filters & Pagination =====

/**
 * @typedef {Object} ProductFilter
 * @property {string[]} [brandIds] - Array of brand UUIDs to filter by
 * @property {number} [minPrice] - Minimum price in Toman
 * @property {number} [maxPrice] - Maximum price in Toman
 * @property {boolean} [inStock] - Filter by stock availability
 * @property {'newest'|'price-asc'|'price-desc'|'name-asc'} [sortBy] - Sort order
 * @property {string} [searchQuery] - Search term
 * @property {number} [page] - Page number (1-indexed)
 * @property {number} [pageSize] - Items per page
 */

/**
 * @typedef {Object<T>} PaginatedResult
 * @property {T[]} items - Array of items for current page
 * @property {number} total - Total number of items across all pages
 * @property {number} page - Current page number
 * @property {number} pageSize - Items per page
 * @property {boolean} hasMore - Whether more pages exist
 * @template T - Type of items in the result
 */

// ===== SECTION: UI-Only Shapes =====

/**
 * @typedef {Object} ToastOptions
 * @property {string} [title] - Toast title (optional)
 * @property {string} message - Toast message (required)
 * @property {'info'|'success'|'warning'|'error'} [variant] - Toast variant (default: 'info')
 * @property {number} [duration] - Auto-dismiss duration in ms (optional)
 * @property {Object} [action] - Action button configuration
 * @property {string} action.label - Action button label
 * @property {function} action.onClick - Action button click handler
 * @property {boolean} [dismissible] - Whether toast can be manually dismissed (default: true)
 */

/**
 * @typedef {Object} ModalOptions
 * @property {string} title - Modal title
 * @property {string|HTMLElement} body - Modal body content (string or DOM element)
 * @property {HTMLElement} [footer] - Modal footer content (optional)
 * @property {'sm'|'md'|'lg'} [size] - Modal size (default: 'md')
 * @property {function} [onClose] - Callback when modal is closed
 */

/**
 * @typedef {Object} UploadProgress
 * @property {number} loaded - Bytes uploaded so far
 * @property {number} total - Total bytes to upload
 * @property {number} percent - Upload progress (0-100)
 */

/**
 * @typedef {Object} UploadedFile
 * @property {string} bucket - Storage bucket name
 * @property {string} path - File path within bucket
 * @property {string} publicUrl - Public URL to access the file
 * @property {string} mimeType - File MIME type
 * @property {number} sizeBytes - File size in bytes
 * @property {number} [width] - Image width in pixels (for images)
 * @property {number} [height] - Image height in pixels (for images)
 */

// ===== SECTION: State Shapes =====

/**
 * @typedef {Object} AppState
 * @property {User|null} user - Currently authenticated user (null if not logged in)
 * @property {Profile|null} profile - Current user's profile (null if not logged in)
 * @property {Cart} cart - Current cart state
 * @property {number} wishlistCount - Number of items in wishlist
 * @property {'fa'} locale - Current locale (currently only 'fa')
 */

/**
 * @typedef {Object} CartState
 * @property {CartItem[]} items - Array of cart items
 * @property {number} count - Total item count (sum of all qty values)
 * @property {number} subtotal - Total price (sum of unitPrice * qty for all items)
 * @property {boolean} isSyncing - Whether cart is being synced with backend
 */

// ===== SECTION: Route & Query Params =====

/**
 * @typedef {Object} ProductListQuery
 * @property {string} [brand] - Comma-separated brand slugs
 * @property {string} [minPrice] - Minimum price filter
 * @property {string} [maxPrice] - Maximum price filter
 * @property {string} [sort] - Sort parameter
 * @property {string} [q] - Search query
 * @property {string} [page] - Page number
 */

/**
 * @typedef {Object} RouteInfo
 * @property {string} path - Current URL path
 * @property {Object<string, string>} query - URL query parameters
 * @property {string} hash - URL hash fragment
 */
