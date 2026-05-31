import { useCallback, useEffect, useState } from 'react';
import { categoryApi, formatPrice, productApi } from '../services/api';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { getProductThumbnail, isImageSource } from '../utils/imageUtils';
import './ProductListPage.css';

const PRODUCTS_PER_PAGE = 9;
const BACKEND_PAGE_SIZE = 500;

const getActiveChildren = (category) =>
  (category.children || []).filter((child) => child?.active !== false);

const flattenCategoryTree = (items = [], level = 0) =>
  (items || [])
    .filter((category) => category?.active !== false)
    .flatMap((category) => {
      const children = getActiveChildren(category);
      return [
        {
          ...category,
          level,
          label: `${'-- '.repeat(level)}${category.name}`,
        },
        ...flattenCategoryTree(children, level + 1),
      ];
    });

const getMinProductPrice = (product) => {
  const activeVariants = (product.variants || []).filter((variant) => variant.active !== false);
  if (!activeVariants.length) return Number(product.basePrice || 0);
  return Math.min(...activeVariants.map((variant) => Number(variant.priceOverride ?? product.basePrice ?? 0)));
};

const sortProductList = (items, sortBy) => {
  const sorted = [...items];
  if (sortBy === 'price-asc') return sorted.sort((a, b) => getMinProductPrice(a) - getMinProductPrice(b));
  if (sortBy === 'price-desc') return sorted.sort((a, b) => getMinProductPrice(b) - getMinProductPrice(a));
  if (sortBy === 'rating') return sorted.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  if (sortBy === 'sold') return sorted.sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0));
  return sorted;
};

const fetchAllProducts = async (params) => {
  const firstPage = await productApi.getAll({ ...params, page: 1, size: BACKEND_PAGE_SIZE });
  const totalPages = firstPage.totalPages || 1;
  let products = firstPage.products || [];

  if (totalPages > 1) {
    const restPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        productApi.getAll({ ...params, page: index + 2, size: BACKEND_PAGE_SIZE })
      )
    );
    products = products.concat(...restPages.map((pageData) => pageData.products || []));
  }

  return sortProductList(products, params.sort);
};

function ProductListItem({ product, navigate, onAddToCart }) {
  const { addToCart } = useCart();
  const activeVariants = (product.variants || []).filter((variant) => variant.active !== false);
  const minPrice = activeVariants.length
    ? Math.min(...activeVariants.map((variant) => variant.priceOverride ?? product.basePrice))
    : product.basePrice;
  const hasDiscount = product.basePrice > minPrice;
  const discountPct = hasDiscount ? Math.round((1 - minPrice / product.basePrice) * 100) : null;
  const firstVariant = activeVariants.find((variant) => variant.stockQuantity > 0);
  const needsVariantChoice = activeVariants.length > 1;
  const thumbnail = getProductThumbnail(product);

  const handleAdd = async (event) => {
    event.stopPropagation();

    if (needsVariantChoice) {
      navigate('product-detail', product);
      return;
    }

    if (!firstVariant) return;
    await addToCart(product, firstVariant);
    onAddToCart?.(product.name);
  };

  return (
    <div className="product-list-item" onClick={() => navigate('product-detail', product)}>
      <div className="pli-img">
        {isImageSource(thumbnail)
          ? <img src={thumbnail} alt={product.name || 'Sản phẩm'} loading="lazy" />
          : thumbnail}
      </div>
      <div className="pli-body">
        <div className="pli-brand">{product.brand}</div>
        <h3 className="pli-name">{product.name}</h3>
        <p className="pli-desc">{product.description?.substring(0, 120)}...</p>
        <div className="pli-meta">
          <div className="product-stars">
            {[1, 2, 3, 4, 5].map((star) => <span key={star} className={`star ${star <= Math.round(product.rating) ? '' : 'empty'}`}>★</span>)}
            <span className="review-count">({product.reviewCount})</span>
          </div>
          <span className="sold-label">Đã bán {product.sold}</span>
        </div>
      </div>
      <div className="pli-right">
        <div className="price-current">{formatPrice(minPrice)}</div>
        {hasDiscount && <div className="price-original">{formatPrice(product.basePrice)}</div>}
        {discountPct && <div className="pli-discount">-{discountPct}%</div>}
        <button className="btn btn-secondary btn-sm" onClick={handleAdd}>
          {needsVariantChoice ? 'Chọn phân loại' : '🛒 Thêm vào giỏ'}
        </button>
      </div>
    </div>
  );
}

export default function ProductListPage({ navigate, routeState }) {
  const initialCategoryId = routeState?.categoryId ? String(routeState.categoryId) : 'all';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCatId, setSelectedCatId] = useState(initialCategoryId);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);

  const showToast = (name) => {
    setToast(name);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    categoryApi.getRoot()
      .then((items) => setCategories(flattenCategoryTree(items || [])))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (routeState?.categoryId) {
      setSelectedCatId(String(routeState.categoryId));
    }
  }, [routeState?.categoryId]);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (selectedCatId !== 'all') params.category = selectedCatId;
    if (priceMin) params.minPrice = priceMin * 1000;
    if (priceMax) params.maxPrice = priceMax * 1000;
    if (sortBy !== 'default') params.sort = sortBy;

    fetchAllProducts(params)
      .then((items) => setProducts(items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, selectedCatId, priceMin, priceMax, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedCatId, priceMin, priceMax, sortBy]);

  const totalPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));
  const firstVisiblePage = Math.max(1, Math.min(page - 3, totalPages - 6));
  const visiblePageNumbers = Array.from(
    { length: Math.min(totalPages, 7) },
    (_, index) => firstVisiblePage + index
  );
  const paginatedProducts = products.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const handleClear = () => {
    setSearch('');
    setSelectedCatId('all');
    setPriceMin('');
    setPriceMax('');
    setSortBy('default');
    setPage(1);
  };

  return (
    <div className="product-list-page">
      {toast && <div className="toast-container"><div className="toast success">✅ {toast} đã thêm vào giỏ!</div></div>}
      <div className="plp-inner">
        <aside className="plp-sidebar">
          <div className="sidebar-header">
            <h3>🔍 Bộ lọc</h3>
            <button className="clear-btn" onClick={handleClear}>Xóa tất cả</button>
          </div>
          <div className="filter-group">
            <label className="filter-label">Tìm kiếm</label>
            <input className="form-input" placeholder="Tên sản phẩm, thương hiệu..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="filter-group">
            <label className="filter-label">Danh mục</label>
            <select className="sort-select filter-category-select" value={selectedCatId} onChange={(event) => setSelectedCatId(event.target.value)}>
              <option value="all">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>{category.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Khoảng giá (nghìn đồng)</label>
            <div className="price-inputs">
              <input className="form-input" type="number" placeholder="Từ" value={priceMin} onChange={(event) => setPriceMin(event.target.value)} />
              <span className="price-sep">—</span>
              <input className="form-input" type="number" placeholder="Đến" value={priceMax} onChange={(event) => setPriceMax(event.target.value)} />
            </div>
            <div className="price-presets">
              {[{ l: '< 200k', min: '', max: '200' }, { l: '200-500k', min: '200', max: '500' }, { l: '> 500k', min: '500', max: '' }].map((preset) => (
                <button key={preset.l} className="price-preset" onClick={() => { setPriceMin(preset.min); setPriceMax(preset.max); }}>{preset.l}</button>
              ))}
            </div>
          </div>
        </aside>

        <div className="plp-main">
          <div className="plp-toolbar">
            <span className="result-count">Tìm thấy <strong>{products.length}</strong> sản phẩm</span>
            <div className="toolbar-right">
              <select className="sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="default">Sắp xếp mặc định</option>
                <option value="price-asc">Giá: Thấp → Cao</option>
                <option value="price-desc">Giá: Cao → Thấp</option>
                <option value="rating">Đánh giá cao nhất</option>
                <option value="sold">Bán chạy nhất</option>
              </select>
              <div className="view-toggle">
                <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>⊞</button>
                <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>≡</button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="empty-state"><div className="emoji">⏳</div><h3>Đang tải...</h3></div>
          ) : products.length === 0 ? (
            <div className="empty-state"><div className="emoji">🔍</div><h3>Không tìm thấy sản phẩm</h3><button className="btn btn-primary" onClick={handleClear}>Xóa bộ lọc</button></div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="product-grid-plp">
                  {paginatedProducts.map((product) => <ProductCard key={product.id} product={product} navigate={navigate} onAddToCart={showToast} />)}
                </div>
              ) : (
                <div className="product-list-view">
                  {paginatedProducts.map((product) => <ProductListItem key={product.id} product={product} navigate={navigate} onAddToCart={showToast} />)}
                </div>
              )}

              {totalPages > 1 && (
                <div className="pagination">
                  <button className="page-btn" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>{'<'}</button>
                  {visiblePageNumbers.map((pageNumber) => (
                    <button key={pageNumber} className={`page-btn ${pageNumber === page ? 'active' : ''}`} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
                  ))}
                  <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>{'>'}</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
