import { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi, categoryApi, formatPrice } from '../../services/api';
import { getProductThumbnail, isImageSource } from '../../utils/imageUtils';

const EMPTY_PRODUCT = {
  name: '',
  description: '',
  brand: '',
  material: '',
  basePrice: '',
  status: 'ACTIVE',
  categoryId: '',
  supplierId: '',
  images: [],
  variants: [{ color: '', size: '', priceOverride: '', stockQuantity: 0, active: true }],
};

const cloneEmptyProduct = () => ({
  ...EMPTY_PRODUCT,
  images: [],
  variants: EMPTY_PRODUCT.variants.map((variant) => ({ ...variant })),
});

const createPendingImages = (files) =>
  Array.from(files || []).map((file, index) => ({
    id: `${Date.now()}-${index}-${file.name}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }));

const getActiveChildren = (category) =>
  (category.children || []).filter((child) => child?.active !== false);

const flattenCategoryTree = (items = [], level = 0, parentNames = []) =>
  (items || [])
    .filter((category) => category?.active !== false)
    .flatMap((category) => {
      const children = getActiveChildren(category);
      const pathParts = [...parentNames, category.name].filter(Boolean);
      return [
        {
          ...category,
          level,
          label: `${'-- '.repeat(level)}${category.name}`,
          pathLabel: pathParts.join(' / '),
          hasChildren: children.length > 0,
        },
        ...flattenCategoryTree(children, level + 1, pathParts),
      ];
    });

function ProductThumb({ product }) {
  const thumbnail = getProductThumbnail(product);
  return isImageSource(thumbnail)
    ? <img className="admin-product-thumb" src={thumbnail} alt={product.name || 'Sản phẩm'} />
    : <span className="admin-product-thumb-fallback">{thumbnail}</span>;
}

export default function ProductsPage({ showToast }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(cloneEmptyProduct);
  const [pendingImages, setPendingImages] = useState([]);
  const pendingImagesRef = useRef([]);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 15;

  const resetPendingImages = useCallback(() => {
    setPendingImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  }, []);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => () => {
    pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);

  const fetchAll = useCallback(() => {
    setLoading(true);
    const p = { page, limit: LIMIT };
    if (search) p.search = search;
    if (catFilter) p.category = catFilter;

    adminApi.getProducts(p)
      .then((d) => { setProducts(d.products || []); setTotal(d.total || 0); })
      .catch(() => showToast('Lỗi tải sản phẩm', 'error'))
      .finally(() => setLoading(false));
  }, [page, search, catFilter, showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    categoryApi.getRoot()
      .then((items) => setCategories(flattenCategoryTree(items || [])))
      .catch(() => {});
    adminApi.getSuppliers().then(setSuppliers).catch(() => {});
  }, []);

  const assignableCategories = categories.filter((category) => !category.hasChildren);

  const closeModal = () => {
    resetPendingImages();
    setShowModal(false);
  };

  const openCreate = () => {
    resetPendingImages();
    setEditing(null);
    setForm(cloneEmptyProduct());
    setShowModal(true);
  };

  const openEdit = (product) => {
    resetPendingImages();
    setEditing(product);
    setForm({
      ...product,
      categoryId: product.categoryId || '',
      supplierId: product.supplierId || '',
      images: Array.isArray(product.images) ? product.images : [],
      variants: product.variants?.length ? product.variants : cloneEmptyProduct().variants,
    });
    setShowModal(true);
  };

  const handleFileSelect = (event) => {
    const selected = createPendingImages(event.target.files);
    setPendingImages((current) => [...current, ...selected]);
    event.target.value = '';
  };

  const removeExistingImage = (index) => {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const removePendingImage = (index) => {
    setPendingImages((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((_, imageIndex) => imageIndex !== index);
    });
  };

  const uploadPendingImages = async () => {
    if (!pendingImages.length) return [];

    const uploaded = await Promise.all(
      pendingImages.map((image) => adminApi.uploadProductImage(image.file))
    );

    return uploaded.map((image) => ({
      imageUrl: image.imageUrl,
      thumbnail: false,
    }));
  };

  const buildProductPayload = async () => {
    const uploadedImages = await uploadPendingImages();
    const images = [...(form.images || []), ...uploadedImages]
      .filter((image) => image?.imageUrl)
      .map((image, index) => ({
        imageUrl: image.imageUrl,
        thumbnail: index === 0,
      }));

    return { ...form, images };
  };

  const handleSave = async () => {
    if (!form.name || !form.basePrice) {
      showToast('Nhập tên và giá sản phẩm', 'error');
      return;
    }

    if (!form.categoryId || !assignableCategories.some((category) => String(category.id) === String(form.categoryId))) {
      showToast('Chon danh muc con cho san pham', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = await buildProductPayload();

      if (editing) {
        await adminApi.updateProduct(editing.id, payload);
        showToast('Đã cập nhật sản phẩm');
      } else {
        await adminApi.createProduct(payload);
        showToast('Đã thêm sản phẩm mới');
      }

      closeModal();
      fetchAll();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa sản phẩm này?')) return;

    try {
      await adminApi.deleteProduct(id);
      showToast('Đã xóa sản phẩm');
      fetchAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const addVariant = () => setForm((current) => ({
    ...current,
    variants: [...current.variants, { color: '', size: '', priceOverride: '', stockQuantity: 0, active: true }],
  }));

  const removeVariant = (index) => setForm((current) => ({
    ...current,
    variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
  }));

  const updateVariant = (index, field, value) => setForm((current) => ({
    ...current,
    variants: current.variants.map((variant, variantIndex) =>
      variantIndex === index ? { ...variant, [field]: value } : variant
    ),
  }));

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <div className="filters">
            <input className="search-input" placeholder="🔍 Tìm tên, thương hiệu..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            <select className="filter-select" value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}>
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
            <button className="btn btn-primary" onClick={openCreate}>+ Thêm sản phẩm</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">🧸 Sản phẩm ({total})</div>
        </div>
        <div className="card-body">
          {loading ? <div className="loading">⏳ Đang tải...</div> : (
            <table>
              <thead>
                <tr>
                  <th>Ảnh</th><th>Tên sản phẩm</th><th>Thương hiệu</th><th>Danh mục</th>
                  <th>Giá gốc</th><th>Variants</th><th>Đã bán</th><th>Trạng thái</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td><ProductThumb product={product} /></td>
                    <td><div style={{ fontWeight: 600, maxWidth: 200 }}>{product.name}</div></td>
                    <td>{product.brand}</td>
                    <td>{product.categoryName || '—'}</td>
                    <td>{formatPrice(product.basePrice)}</td>
                    <td>
                      {(product.variants || []).map((variant, index) => (
                        <div key={index} style={{ fontSize: 11, color: '#4b5563' }}>
                          {variant.color || 'Mặc định'}{variant.size ? `/${variant.size}` : ''} — {formatPrice(variant.priceOverride || product.basePrice)} (còn {variant.stockQuantity})
                        </div>
                      ))}
                    </td>
                    <td>{product.sold}</td>
                    <td><span className={`badge ${product.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>{product.status === 'ACTIVE' ? 'Đang bán' : 'Ẩn'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(product)}>✏️</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDelete(product.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>‹</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((pageNumber) => (
            <button key={pageNumber} className={`page-btn ${pageNumber === page ? 'active' : ''}`} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
          ))}
          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>›</button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing ? '✏️ Sửa sản phẩm' : '➕ Thêm sản phẩm'}</div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tên sản phẩm *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Thương hiệu</label>
                <input className="form-input" value={form.brand || ''} onChange={(e) => setForm((current) => ({ ...current, brand: e.target.value }))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Danh mục</label>
                <select className="form-select" value={form.categoryId || ''} onChange={(e) => setForm((current) => ({ ...current, categoryId: e.target.value }))}>
                  <option value="">-- Chọn danh mục --</option>
                  {assignableCategories.map((category) => <option key={category.id} value={category.id}>{category.pathLabel}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nhà cung cấp</label>
                <select className="form-select" value={form.supplierId || ''} onChange={(e) => setForm((current) => ({ ...current, supplierId: e.target.value }))}>
                  <option value="">-- Chọn NCC --</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Giá gốc (basePrice) *</label>
                <input className="form-input" type="number" value={form.basePrice} onChange={(e) => setForm((current) => ({ ...current, basePrice: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Chất liệu</label>
                <input className="form-input" value={form.material || ''} onChange={(e) => setForm((current) => ({ ...current, material: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả</label>
              <textarea className="form-input" rows={3} value={form.description || ''} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} style={{ resize: 'none' }} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Ảnh sản phẩm</label>
                <input className="form-input" type="file" accept="image/*" multiple onChange={handleFileSelect} />
                <div className="upload-hint">Hỗ trợ JPG, PNG, WEBP, GIF. Tối đa 5MB mỗi ảnh.</div>
              </div>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select className="form-select" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
                  <option value="ACTIVE">Đang bán</option>
                  <option value="INACTIVE">Ẩn</option>
                </select>
              </div>
            </div>

            {Boolean((form.images || []).length || pendingImages.length) && (
              <div className="product-image-preview-grid">
                {(form.images || []).map((image, index) => (
                  <div key={`${image.imageUrl}-${index}`} className="product-image-preview">
                    {isImageSource(image.imageUrl)
                      ? <img src={image.imageUrl} alt={`Ảnh sản phẩm ${index + 1}`} />
                      : <span className="product-image-preview-fallback">{image.imageUrl}</span>}
                    {index === 0 && <span className="thumb-badge">Ảnh chính</span>}
                    <button type="button" onClick={() => removeExistingImage(index)}>✕</button>
                  </div>
                ))}
                {pendingImages.map((image, index) => (
                  <div key={image.id} className="product-image-preview">
                    <img src={image.previewUrl} alt={image.file.name} />
                    <span className="thumb-badge pending">Chưa lưu</span>
                    <button type="button" onClick={() => removePendingImage(index)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>Phân loại sản phẩm (Variants)</label>
                <button className="btn btn-outline btn-sm" onClick={addVariant}>+ Thêm phân loại</button>
              </div>
              {form.variants.map((variant, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 30px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input className="form-input" placeholder="Màu sắc" value={variant.color || ''} onChange={(e) => updateVariant(index, 'color', e.target.value)} />
                  <input className="form-input" placeholder="Kích thước" value={variant.size || ''} onChange={(e) => updateVariant(index, 'size', e.target.value)} />
                  <input className="form-input" type="number" placeholder="Giá bán" value={variant.priceOverride || ''} onChange={(e) => updateVariant(index, 'priceOverride', e.target.value)} />
                  <input className="form-input" type="number" placeholder="Tồn kho" value={variant.stockQuantity} onChange={(e) => updateVariant(index, 'stockQuantity', e.target.value)} />
                  <button style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 16, cursor: 'pointer' }} onClick={() => removeVariant(index)}>✕</button>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : '💾 Lưu'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
