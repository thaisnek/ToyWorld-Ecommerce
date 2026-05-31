import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { productApi, reviewApi, formatPrice } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getProductThumbnail, isImageSource } from '../utils/imageUtils';
import './ProductDetailPage.css';

const getActiveVariants = (product) =>
  (product?.variants || []).filter((variant) => variant.active !== false);

const getVariantLabel = (variant) =>
  [variant?.color, variant?.size].filter(Boolean).join(' / ') || 'Phân loại mặc định';

const getFirstStockVariant = (variants) =>
  variants.find((variant) => variant.stockQuantity > 0) || variants[0] || null;

const getInitialVariant = (variants) =>
  variants.length === 1 ? getFirstStockVariant(variants) : null;

const getMinVariantPrice = (product, variants) => {
  if (!variants.length) return product?.basePrice ?? 0;
  return Math.min(...variants.map((variant) => variant.priceOverride ?? product.basePrice));
};

export default function ProductDetailPage({ navigate, product: propProduct, routeState }) {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const productId = propProduct?.id ?? id;
  const reviewOrderItemId = routeState?.reviewOrderItemId;
  const reviewsRef = useRef(null);

  const [product, setProduct] = useState(propProduct || null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(!propProduct);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('desc');
  const [toast, setToast] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!productId) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    productApi.getById(productId)
      .then(async (productData) => {
        if (cancelled) return;
        const prod = productData.product || productData;
        const variants = getActiveVariants(prod);

        setProduct(prod);
        setSelectedVariant(getInitialVariant(variants));
        setQty(1);

        const reviewData = await reviewApi.getByProduct(prod.id).catch(() => []);
        if (!cancelled) setReviews(reviewData?.content || reviewData || []);
      })
      .catch(() => {
        if (!cancelled) {
          setProduct(propProduct || null);
          setSelectedVariant(getInitialVariant(getActiveVariants(propProduct)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, propProduct]);

  useEffect(() => {
    if (!reviewOrderItemId || loading) return;
    setReviewSubmitted(false);
    setReviewComment('');
    setReviewRating(5);
    setActiveTab('reviews');
    setTimeout(() => {
      reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }, [reviewOrderItemId, loading]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const resolveVariantForCart = () => {
    const variants = getActiveVariants(product);
    if (!variants.length) {
      showToast('Sản phẩm chưa có phân loại để thêm vào giỏ', 'error');
      return null;
    }
    if (!selectedVariant) {
      showToast('Vui lòng chọn phân loại sản phẩm', 'error');
      return null;
    }
    if (selectedVariant.stockQuantity <= 0) {
      showToast('Phân loại này đã hết hàng', 'error');
      return null;
    }
    return selectedVariant;
  };

  const handleAddToCart = async () => {
    const variant = resolveVariantForCart();
    if (!variant) return;

    try {
      await addToCart(product, variant, qty);
      showToast(`Đã thêm "${product.name}" vào giỏ hàng!`);
    } catch (err) {
      showToast(err.message || 'Không thể thêm vào giỏ hàng', 'error');
    }
  };

  const handleBuyNow = async () => {
    const variant = resolveVariantForCart();
    if (!variant) return;

    try {
      await addToCart(product, variant, qty);
      navigate('cart');
    } catch (err) {
      showToast(err.message || 'Không thể thêm vào giỏ hàng', 'error');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewOrderItemId) {
      showToast('Không tìm thấy mục đơn hàng để đánh giá', 'error');
      return;
    }
    if (!reviewComment.trim()) {
      showToast('Vui lòng nhập nội dung đánh giá', 'error');
      return;
    }

    setReviewSubmitting(true);
    try {
      await reviewApi.create({
        orderItemId: reviewOrderItemId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewSubmitted(true);
      setReviewComment('');
      showToast('Đã gửi đánh giá. Đánh giá sẽ hiển thị sau khi được duyệt.');
    } catch (err) {
      showToast(err.message || 'Không thể gửi đánh giá', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pdp-page">
        <div className="pdp-inner" style={{ textAlign: 'center', padding: '60px 0' }}>⏳ Đang tải...</div>
      </div>
    );
  }

  if (!product) return null;

  const activeVariants = getActiveVariants(product);
  const minVariantPrice = getMinVariantPrice(product, activeVariants);
  const displayPrice = selectedVariant?.priceOverride ?? minVariantPrice;
  const hasDiscount = product.basePrice > displayPrice;
  const discountPct = hasDiscount ? Math.round((1 - displayPrice / product.basePrice) * 100) : null;
  const totalStock = activeVariants.reduce((sum, variant) => sum + (variant.stockQuantity || 0), 0);
  const hasStock = activeVariants.some((variant) => variant.stockQuantity > 0);
  const stockText = selectedVariant ? selectedVariant.stockQuantity : totalStock;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : product.rating;
  const thumbnail = getProductThumbnail(product);

  return (
    <div className="pdp-page">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.msg}</div>
        </div>
      )}
      <div className="pdp-inner">
        <div className="breadcrumb">
          <button onClick={() => navigate('home')}>🏠 Trang chủ</button><span>›</span>
          <button onClick={() => navigate('products')}>Sản phẩm</button><span>›</span>
          <button onClick={() => navigate('products')}>{product.brand}</button><span>›</span>
          <span>{product.name}</span>
        </div>

        <div className="pdp-main">
          <div className="pdp-gallery">
            <div className="pdp-main-img">
              {isImageSource(thumbnail)
                ? <img className="pdp-photo" src={thumbnail} alt={product.name} />
                : <div className="pdp-emoji">{thumbnail}</div>}
              {discountPct && <span className="pdp-badge">-{discountPct}%</span>}
            </div>
            <div className="pdp-thumbnails">
              {(product.images || []).map((img, index) => (
                <div key={img.id || index} className={`pdp-thumb ${index === 0 ? 'active' : ''}`}>
                  {isImageSource(img.imageUrl)
                    ? <img src={img.imageUrl} alt="" />
                    : img.imageUrl}
                </div>
              ))}
            </div>
          </div>

          <div className="pdp-info">
            <div className="pdp-brand">{product.brand}</div>
            <h1 className="pdp-name">{product.name}</h1>
            <div className="pdp-rating-row">
              <div className="stars">{[1, 2, 3, 4, 5].map((star) => <span key={star} className={`star ${star <= Math.round(Number(avgRating)) ? '' : 'empty'}`}>★</span>)}</div>
              <span className="pdp-avg">{avgRating}</span>
              <span className="pdp-review-count">({reviews.length} đánh giá)</span>
              <span className="pdp-sold">• Đã bán {product.sold?.toLocaleString()}</span>
            </div>

            <div className="pdp-price-block">
              <span className="pdp-price">{formatPrice(displayPrice)}</span>
              {hasDiscount && <span className="pdp-price-old">{formatPrice(product.basePrice)}</span>}
              {discountPct && <span className="pdp-discount-badge">-{discountPct}%</span>}
            </div>

            <div className="pdp-meta-tags">
              <span className="meta-tag">🏭 {product.brand}</span>
              <span className="meta-tag">🧱 {product.material}</span>
              <span className="meta-tag">📦 Còn {stockText} sản phẩm</span>
            </div>

            {activeVariants.length > 0 && (
              <div className="variant-selector">
                <div className="variant-label">
                  Chọn phân loại:
                  {!selectedVariant && activeVariants.length > 1 && <span className="variant-required"> Bắt buộc</span>}
                </div>
                <div className="variant-options">
                  {activeVariants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      className={`variant-btn ${selectedVariant?.id === variant.id ? 'selected' : ''} ${variant.stockQuantity === 0 ? 'oos' : ''}`}
                      onClick={() => { setSelectedVariant(variant); setQty(1); }}
                      disabled={variant.stockQuantity === 0}
                      aria-pressed={selectedVariant?.id === variant.id}
                    >
                      <div className="vb-color">{getVariantLabel(variant)}</div>
                      <div className="vb-price">{formatPrice(variant.priceOverride ?? product.basePrice)}</div>
                      <div className="vb-stock">Còn {variant.stockQuantity}</div>
                      {variant.stockQuantity === 0 && <div className="vb-oos">Hết hàng</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pdp-qty-row">
              <label>Số lượng:</label>
              <div className="qty-control">
                <button onClick={() => setQty((current) => Math.max(1, current - 1))}>−</button>
                <span>{qty}</span>
                <button onClick={() => setQty((current) => Math.min(selectedVariant?.stockQuantity || 1, current + 1))}>+</button>
              </div>
              <span className="stock-note">Còn {stockText} trong kho</span>
            </div>

            <div className="pdp-cta">
              <button className="btn btn-secondary btn-lg" onClick={handleAddToCart} disabled={!hasStock}>🛒 Thêm vào giỏ hàng</button>
              <button className="btn btn-primary btn-lg" onClick={handleBuyNow} disabled={!hasStock}>⚡ Mua ngay</button>
            </div>

            <div className="pdp-shipping">
              <div className="shipping-row"><span>🚚</span><span>Giao hàng nhanh 2-4h nội thành</span></div>
              <div className="shipping-row"><span>↩️</span><span>Đổi trả miễn phí trong 30 ngày</span></div>
              <div className="shipping-row"><span>🔒</span><span>Sản phẩm được kiểm định an toàn</span></div>
            </div>
          </div>
        </div>

        <div className="pdp-tabs-section" ref={reviewsRef}>
          <div className="pdp-tabs">
            {[{ key: 'desc', label: '📋 Mô tả' }, { key: 'specs', label: '📊 Thông số' }, { key: 'reviews', label: `⭐ Đánh giá (${reviews.length})` }].map((tab) => (
              <button key={tab.key} className={`pdp-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
            ))}
          </div>
          <div className="pdp-tab-content">
            {activeTab === 'desc' && (
              <div className="tab-desc">
                <p>{product.description}</p>
                <div className="desc-tags"><span className="desc-tag">#{product.brand}</span><span className="desc-tag">#{product.material}</span></div>
              </div>
            )}
            {activeTab === 'specs' && (
              <div className="tab-specs">
                <table className="specs-table"><tbody>
                  <tr><td className="spec-key">Thương hiệu</td><td className="spec-val">{product.brand}</td></tr>
                  <tr><td className="spec-key">Chất liệu</td><td className="spec-val">{product.material}</td></tr>
                  <tr><td className="spec-key">Giá niêm yết</td><td className="spec-val">{formatPrice(product.basePrice)}</td></tr>
                  {activeVariants.map((variant) => (
                    <tr key={variant.id}><td className="spec-key">{getVariantLabel(variant)}</td><td className="spec-val">{formatPrice(variant.priceOverride ?? product.basePrice)} · Còn {variant.stockQuantity}</td></tr>
                  ))}
                </tbody></table>
              </div>
            )}
            {activeTab === 'reviews' && (
              <div className="tab-reviews">
                {reviewOrderItemId && (
                  <div className="write-review">
                    {reviewSubmitted ? (
                      <div className="review-success">✅ Đã gửi đánh giá cho sản phẩm này. Cảm ơn bạn!</div>
                    ) : (
                      <>
                        <h4>Viết đánh giá của bạn</h4>
                        {!user && <div className="login-prompt">Bạn cần đăng nhập để gửi đánh giá.</div>}
                        <div className="review-rating-row">
                          <span>Đánh giá:</span>
                          <div className="star-input">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                className={`star-btn ${star <= reviewRating ? 'filled' : ''}`}
                                onClick={() => setReviewRating(star)}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          className="form-input review-textarea"
                          rows={3}
                          placeholder="Chia sẻ cảm nhận của bạn về sản phẩm này..."
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                        />
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={handleSubmitReview}
                          disabled={reviewSubmitting || !reviewComment.trim() || !user}
                        >
                          {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                        </button>
                      </>
                    )}
                  </div>
                )}
                <div className="rating-summary"><div className="rating-big">
                  <div className="rating-num">{avgRating}</div>
                  <div className="stars">{[1, 2, 3, 4, 5].map((star) => <span key={star} className={`star ${star <= Math.round(Number(avgRating)) ? '' : 'empty'}`}>★</span>)}</div>
                  <div className="rating-total">{reviews.length} đánh giá</div>
                </div></div>
                <div className="review-list" style={{ marginTop: 24 }}>
                  {reviews.map((review, index) => (
                    <div key={review.id || index} className="review-item">
                      <div className="review-header">
                        <span className="review-avatar">👤</span>
                        <div>
                          <div className="review-user">{review.customerName || 'Khách hàng'}</div>
                          <div className="review-meta-row">
                            <div className="stars">{[1, 2, 3, 4, 5].map((star) => <span key={star} className={`star ${star <= review.rating ? '' : 'empty'}`}>★</span>)}</div>
                            <span className="review-date">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                      </div>
                      <p className="review-comment">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
