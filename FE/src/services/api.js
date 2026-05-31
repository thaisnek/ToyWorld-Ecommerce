const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/httmdt/api';

const getToken = () => localStorage.getItem('toyworld_token');

const request = async (path, options = {}) => {
  const token = getToken();
  const { headers: customHeaders = {}, ...rest } = options;
  const shouldSendJson = rest.body !== undefined && !(rest.body instanceof FormData);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: {
        ...(shouldSendJson ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...customHeaders,
      },
    });
  } catch {
    throw new Error('Không kết nối được backend. Kiểm tra backend port 8080 và khởi động lại frontend dev server.');
  }

  const text = await res.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  if (!res.ok) {
    const message = typeof json === 'object' && json
      ? json.message || Object.values(json.data || {})[0]
      : text;
    throw new Error(message || 'Lỗi máy chủ');
  }

  if (!text || res.status === 204) return null;

  // Backend returns data in a generic ApiResponse wrapper: { message: "...", data: { ... } }
  // We return the actual data object here to simplify component logic.
  return json?.data !== undefined ? json.data : json;
};

const toQuery = (params = {}) => {
  const clean = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') clean[key] = value;
  });
  return new URLSearchParams(clean).toString();
};

const withQuery = (path, params = {}) => {
  const query = toQuery(params);
  return query ? `${path}?${query}` : path;
};

const activeCategories = (categories = []) =>
  categories.filter((category) => category?.active !== false);

const getRootOneChildren = async (rootId = 1) => {
  try {
    const rootCategories = await request('/categories/root');
    const root = (rootCategories || []).find((category) => String(category.id) === String(rootId));
    const children = activeCategories(Array.isArray(root?.children) ? root.children : []);
    if (children.length) return children;
  } catch {
    // Fall back to the flat category list below.
  }

  const allCategories = await request('/categories');
  return activeCategories((allCategories || []).filter((category) => String(category.parentId) === String(rootId)));
};

const toBackendPage = (page) => {
  if (page === undefined || page === null || page === '') return 0;
  const value = Number(page);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value - 1;
};

const pageParams = (params = {}) => ({
  page: toBackendPage(params.page),
  size: params.size ?? params.limit ?? 10,
});

const normalizePage = (data, listKey) => {
  if (Array.isArray(data)) {
    return {
      [listKey]: data,
      content: data,
      total: data.length,
      totalElements: data.length,
      totalPages: 1,
      number: 0,
      size: data.length,
    };
  }

  const content = Array.isArray(data?.content)
    ? data.content
    : Array.isArray(data?.[listKey])
      ? data[listKey]
      : [];

  return {
    ...(data || {}),
    [listKey]: content,
    content,
    total: data?.total ?? data?.totalElements ?? content.length,
    totalElements: data?.totalElements ?? content.length,
    totalPages: data?.totalPages ?? 1,
  };
};

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProduct = (product = {}) => {
  const basePrice = toNumber(product.basePrice);
  const variants = Array.isArray(product.variants)
    ? product.variants.map((variant) => ({
        ...variant,
        id: variant.id ?? variant.variantId,
        active: variant.active ?? variant.isActive ?? true,
        priceOverride: toNumber(variant.priceOverride, basePrice),
        stockQuantity: toNumber(variant.stockQuantity),
      }))
    : [];

  return {
    ...product,
    basePrice,
    variants,
    images: Array.isArray(product.images) ? product.images : [],
    rating: toNumber(product.rating),
    reviewCount: toNumber(product.reviewCount),
    sold: toNumber(product.sold ?? product.soldQuantity),
    status: product.status || 'ACTIVE',
  };
};

const minProductPrice = (product) => {
  const variants = (product.variants || []).filter((variant) => variant.active !== false);
  if (!variants.length) return toNumber(product.basePrice);
  return Math.min(...variants.map((variant) => toNumber(variant.priceOverride, toNumber(product.basePrice))));
};

const sortProducts = (products, sort) => {
  const sorted = [...products];
  if (sort === 'price-asc') return sorted.sort((a, b) => minProductPrice(a) - minProductPrice(b));
  if (sort === 'price-desc') return sorted.sort((a, b) => minProductPrice(b) - minProductPrice(a));
  if (sort === 'rating') return sorted.sort((a, b) => toNumber(b.rating) - toNumber(a.rating));
  if (sort === 'sold') return sorted.sort((a, b) => toNumber(b.sold) - toNumber(a.sold));
  return sorted;
};

const normalizeProductsPayload = (data, params = {}) => {
  const page = normalizePage(data, 'products');
  let products = page.content.map(normalizeProduct);

  if (params.search && !params._serverSearched) {
    const keyword = String(params.search).toLowerCase();
    products = products.filter((product) =>
      [product.name, product.brand, product.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }

  if (params.category && !params._serverCategorized) {
    products = products.filter((product) => String(product.categoryId) === String(params.category));
  }

  if (params.minPrice) {
    products = products.filter((product) => minProductPrice(product) >= Number(params.minPrice));
  }

  if (params.maxPrice) {
    products = products.filter((product) => minProductPrice(product) <= Number(params.maxPrice));
  }

  products = sortProducts(products, params.sort);

  return {
    ...page,
    products,
    content: products,
  };
};

const productSortParams = (sort) => {
  if (sort === 'price-asc') return { sortBy: 'basePrice', sortDir: 'asc' };
  if (sort === 'price-desc') return { sortBy: 'basePrice', sortDir: 'desc' };
  return { sortBy: 'createdAt', sortDir: 'desc' };
};

const sanitizeProductPayload = (body = {}) => ({
  ...body,
  basePrice: body.basePrice === '' ? null : Number(body.basePrice),
  categoryId: body.categoryId ? Number(body.categoryId) : null,
  supplierId: body.supplierId ? Number(body.supplierId) : null,
  variants: (body.variants || []).map((variant) => ({
    ...variant,
    priceOverride: variant.priceOverride === '' ? null : Number(variant.priceOverride),
    stockQuantity: Number(variant.stockQuantity || 0),
    active: variant.active ?? true,
  })),
  images: (body.images || [])
    .filter((image) => image?.imageUrl)
    .map((image, index) => ({
      imageUrl: image.imageUrl,
      thumbnail: index === 0 ? true : Boolean(image.thumbnail),
    })),
});

const normalizeCart = (cart) => {
  const items = (cart?.items || []).map((item) => ({
    ...item,
    id: item.id ?? item.cartItemId,
    cartItemId: item.cartItemId ?? item.id,
    unitPrice: toNumber(item.unitPrice),
    quantity: toNumber(item.quantity),
  }));

  return {
    ...(cart || {}),
    items,
    itemCount: cart?.itemCount ?? items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: toNumber(cart?.totalAmount, items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)),
  };
};

const normalizeOrder = (order = {}) => ({
  ...order,
  subtotal: toNumber(order.subtotal),
  discountAmount: toNumber(order.discountAmount),
  shippingFee: toNumber(order.shippingFee),
  totalAmount: toNumber(order.totalAmount),
  payment: order.payment || {
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
  },
  shipment: order.shipment || {
    shipmentStatus: order.shippingStatus,
  },
  items: (order.items || []).map((item) => ({
    ...item,
    unitPrice: toNumber(item.unitPrice),
    lineTotal: toNumber(item.lineTotal),
    quantity: toNumber(item.quantity),
  })),
});

const normalizeOrdersPayload = (data, params = {}) => {
  const page = normalizePage(data, 'orders');
  let orders = page.content.map(normalizeOrder);

  if (params.status && params.status !== 'all') {
    orders = orders.filter((order) => order.orderStatus === params.status);
  }

  return {
    ...page,
    orders,
    content: orders,
  };
};

const normalizeShipment = (shipment = {}) => ({
  ...shipment,
  totalAmount: toNumber(shipment.totalAmount),
  items: (shipment.items || []).map((item) => ({
    ...item,
    unitPrice: toNumber(item.unitPrice),
    lineTotal: toNumber(item.lineTotal),
    quantity: toNumber(item.quantity),
  })),
});

const normalizeShipmentsPayload = (data) => {
  const page = normalizePage(data, 'shipments');
  const shipments = page.content.map(normalizeShipment);
  return {
    ...page,
    shipments,
    content: shipments,
  };
};

const getProductList = async (params = {}) => {
  const paging = pageParams(params);

  if (params.category) {
    const data = await request(withQuery(`/products/category/${params.category}`, paging));
    return normalizeProductsPayload(data, { ...params, _serverCategorized: true });
  }

  if (params.search) {
    const data = await request(withQuery('/products/search', {
      ...paging,
      keyword: params.search,
    }));
    return normalizeProductsPayload(data, { ...params, _serverSearched: true });
  }

  if (params.minPrice || params.maxPrice) {
    const data = await request(withQuery('/products/filter', {
      ...paging,
      minPrice: params.minPrice || 0,
      maxPrice: params.maxPrice || 999999999999,
    }));
    return normalizeProductsPayload(data, params);
  }

  const data = await request(withQuery('/products', {
    ...paging,
    ...productSortParams(params.sort),
  }));
  return normalizeProductsPayload(data, params);
};

const getAdminProductList = async (params = {}) => {
  const data = await request(withQuery('/admin/products', {
    ...pageParams(params),
    search: params.search,
    category: params.category,
    status: params.status && params.status !== 'all' ? params.status : undefined,
    ...productSortParams(params.sort),
  }));
  return normalizeProductsPayload(data, { ...params, _serverSearched: true, _serverCategorized: true });
};

const getOrdersPage = async (path, params = {}) => {
  const data = await request(withQuery(path, {
    ...pageParams(params),
    status: params.status && params.status !== 'all' ? params.status : undefined,
  }));
  return normalizeOrdersPayload(data, params);
};

const getShipmentsPage = async (path, params = {}) => {
  const data = await request(withQuery(path, {
    ...pageParams(params),
    status: params.status && params.status !== 'all' ? params.status : undefined,
    deliveryStaffId: params.deliveryStaffId,
  }));
  return normalizeShipmentsPayload(data);
};

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  // Mapping email to userName for the backend
  login:    ({ email, password }) => request('/auth/login', { method: 'POST', body: JSON.stringify({ userName: email, password }) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  getMe:    ()     => request('/auth/me'),
};

// ── Products ──────────────────────────────────────────────────
export const productApi = {
  getAll:  getProductList,
  getById: async (id) => normalizeProduct(await request(`/products/${id}`)),
};

// ── Categories ────────────────────────────────────────────────
export const categoryApi = {
  getAll: () => request('/categories'),
  getRoot: () => request('/categories/root'),
  getRootOneChildren,
};

// ── Cart ──────────────────────────────────────────────────────
export const cartApi = {
  get:    async () => normalizeCart(await request('/cart')),
  add:    async ({ variantId, quantity }) => normalizeCart(await request('/cart', {
    method: 'POST',
    body: JSON.stringify({ variantId, quantity }),
  })),
  update: async ({ itemId, cartItemId, quantity }) => normalizeCart(await request(withQuery(`/cart/items/${itemId ?? cartItemId}`, { quantity }), {
    method: 'PUT',
  })),
  remove: async (itemId) => normalizeCart(await request(`/cart/items/${itemId}`, { method: 'DELETE' })),
  clear:  async () => normalizeCart(await request('/cart', { method: 'DELETE' })),
};

// ── Orders ────────────────────────────────────────────────────
export const orderApi = {
  create:  async (body) => normalizeOrder(await request('/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  })),
  getMy:   (params) => getOrdersPage('/orders', params || {}),
  getById: async (id) => normalizeOrder(await request(`/orders/${id}`)),
  cancel:  async (id, reason) => normalizeOrder(await request(withQuery(`/orders/${id}/cancel`, { reason }), { method: 'PUT' })),
  complete: async (id) => normalizeOrder(await request(`/orders/${id}/complete`, { method: 'PUT' })),
};

// ── Payments ──────────────────────────────────────────────────
export const shipmentApi = {
  getAll: (params) => getShipmentsPage('/admin/shipments', params || {}),
  getMyAssignments: (params) => getShipmentsPage('/shipments/my-assignments', params || {}),
  assign: async (orderId, deliveryStaffId) => normalizeShipment(await request(`/admin/shipments/${orderId}/assign`, {
    method: 'PUT',
    body: JSON.stringify({ deliveryStaffId }),
  })),
  updateStatus: async (shipmentId, body) => normalizeShipment(await request(`/shipments/${shipmentId}/status`, {
    method: 'PUT',
    body: JSON.stringify({
      status: body.status,
      failureReason: body.failureReason,
    }),
  })),
  getByOrder: async (orderId) => normalizeShipment(await request(`/shipments/order/${orderId}`)),
};

// ── Reviews ───────────────────────────────────────────────────
export const reviewApi = {
  getByProduct: (productId) => request(`/reviews/product/${productId}`),
  create: (body) => request('/reviews', { method: 'POST', body: JSON.stringify(body) }),
};

// ── User / Profile ────────────────────────────────────────────
export const userApi = {
  getProfile:     ()     => request('/auth/me'), // Updated endpoint based on backend AuthController
  updateProfile:  (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => request('/auth/change-password', { method: 'PUT', body: JSON.stringify(body) }),
  getAddresses:   ()     => request('/addresses'), // Based on AddressController (Assuming mapped to /addresses)
  addAddress:     (body) => request('/addresses',     { method: 'POST', body: JSON.stringify(body) }),
  updateAddress:  (id, body) => request(`/addresses/${id}`, { method: 'PUT',  body: JSON.stringify(body) }),
  deleteAddress:  (id)   => request(`/addresses/${id}`,     { method: 'DELETE' }),
  setDefaultAddress: (id) => request(`/addresses/${id}/default`, { method: 'PUT' }),
};

// ── Loyalty ───────────────────────────────────────────────────
export const loyaltyApi = {
  getMyAccount:      () => request('/loyalty/account'),
  getMyTransactions:  (p) => request('/loyalty/transactions?' + new URLSearchParams(p || {})),
};

// ── Admin ─────────────────────────────────────────────────────
export const adminApi = {
  getStats: async () => {
    try {
      return await request('/admin/stats');
    } catch {
      const [ordersResult, productsResult, usersResult] = await Promise.allSettled([
        getOrdersPage('/admin/orders', { size: 100 }),
        getProductList({ size: 100 }),
        request(withQuery('/users', { size: 100 })),
      ]);

      const ordersPage = ordersResult.status === 'fulfilled' ? ordersResult.value : { orders: [], total: 0 };
      const productsPage = productsResult.status === 'fulfilled' ? productsResult.value : { products: [], total: 0 };
      const usersPage = usersResult.status === 'fulfilled' ? normalizePage(usersResult.value, 'users') : { users: [], total: 0 };
      const orders = ordersPage.orders || [];

      return {
        totalOrders: ordersPage.total ?? orders.length,
        totalProducts: productsPage.total ?? (productsPage.products || []).length,
        totalUsers: usersPage.total ?? (usersPage.users || []).length,
        pendingOrders: orders.filter((order) => order.orderStatus === 'PENDING').length,
        revenue: orders
          .filter((order) => order.orderStatus === 'COMPLETED')
          .reduce((sum, order) => sum + toNumber(order.totalAmount), 0),
        recentOrders: orders.slice(0, 5),
      };
    }
  },

  getTopSellingProducts: (limit = 5) => request(withQuery('/admin/stats/products/top-selling', { limit })),
  getLowSellingProducts: (limit = 5) => request(withQuery('/admin/stats/products/low-selling', { limit })),

  // Orders
  getOrders:       (p) => getOrdersPage('/admin/orders', p || {}),
  updateOrderStatus: (id, body) => request(`/admin/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({
      orderStatus: body.orderStatus,
      cancelReason: body.cancelReason || body.reason,
    }),
  }),
  getOrderById: async (id) => normalizeOrder(await request(`/admin/orders/${id}`)),

  // Shipments
  getShipments:    (p) => shipmentApi.getAll(p || {}),
  assignShipment:  (orderId, deliveryStaffId) => shipmentApi.assign(orderId, deliveryStaffId),

  // Products
  getProducts:     getAdminProductList,
  createProduct:   (body) => request('/products', { method: 'POST', body: JSON.stringify(sanitizeProductPayload(body)) }),
  updateProduct:   (id, body) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(sanitizeProductPayload(body)) }),
  deleteProduct:   (id) => request(`/products/${id}`, { method: 'DELETE' }),
  uploadProductImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/products/images/upload', { method: 'POST', body: formData });
  },

  // Categories
  createCategory:  (body) => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory:  (id, b) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteCategory:  (id)   => request(`/categories/${id}`, { method: 'DELETE' }),

  // Suppliers
  getSuppliers:    ()     => request('/suppliers/all'),
  createSupplier:  (body) => request('/suppliers', { method: 'POST', body: JSON.stringify(body) }),
  updateSupplier:  (id, b) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteSupplier:  (id)   => request(`/suppliers/${id}`, { method: 'DELETE' }),

  // Users (Backend: /api/users, not /api/admin/users)
  getUsers:        (p)    => request('/users?' + new URLSearchParams(p || {})),
  getUserById:     (id)   => request(`/users/${id}`),
  updateUserStatus:(id, status) => request(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updateUserRole:  (id, role) => request(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  getDeliveryStaff: () => request('/admin/users/delivery-staff'),

  // Reviews
  getReviews: async (p) => normalizePage(await request(withQuery('/admin/reviews', pageParams(p || {}))), 'reviews'),
  getReviewsByProduct: async (productId, p) => normalizePage(await request(withQuery(`/admin/reviews/product/${productId}`, pageParams(p || {}))), 'reviews'),
  approveReview:   (id) => request(`/admin/reviews/${id}/approve`, { method: 'PUT' }),
  deleteReview:    (id) => request(`/admin/reviews/${id}`, { method: 'DELETE' }),

  // Voucher Types
  getVoucherTypes:    () => request('/admin/vouchers/types'),
  createVoucherType:  (body) => request('/admin/vouchers/types', { method: 'POST', body: JSON.stringify(body) }),

  // Vouchers
  getVouchers:     async (p) => normalizePage(await request(withQuery('/admin/vouchers', p || {})), 'vouchers'),
  createVoucher:   (body) => request('/admin/vouchers', { method: 'POST', body: JSON.stringify(body) }),
  deleteVoucher:   (id)   => request(`/admin/vouchers/${id}`, { method: 'DELETE' }),
};

// ── Messages ─────────────────────────────────────────────────
export const messageApi = {
  getConversations: () => request('/messages/conversations'),
  getMessages:      (convId, p) => request(withQuery(`/messages/conversations/${convId}`, p || {})),
  send:             (body) => request('/messages', { method: 'POST', body: JSON.stringify(body) }),
};

export const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(toNumber(price));

export const formatDate  = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
