import { useCart } from '../context/CartContext';
import { formatPrice } from '../services/api';
import { getProductThumbnail, isImageSource } from '../utils/imageUtils';
import './ProductCard.css';

export default function ProductCard({ product, navigate, onAddToCart }) {
  const { addToCart } = useCart();
  const variants = product.variants || [];
  const active = variants.filter((variant) => variant.active !== false);
  const inStock = active.some((variant) => variant.stockQuantity > 0);
  const minPrice = active.length
    ? Math.min(...active.map((variant) => variant.priceOverride ?? product.basePrice))
    : product.basePrice;
  const hasDiscount = product.basePrice > minPrice;
  const discountPct = hasDiscount ? Math.round((1 - minPrice / product.basePrice) * 100) : null;
  const thumbnail = getProductThumbnail(product);
  const firstAvail = active.find((variant) => variant.stockQuantity > 0);
  const needsVariantChoice = active.length > 1;

  const handleAdd = async (event) => {
    event.stopPropagation();

    if (needsVariantChoice) {
      navigate('product-detail', product);
      return;
    }

    if (!firstAvail) return;
    await addToCart(product, firstAvail, 1);
    onAddToCart?.(product.name);
  };

  return (
    <div className="product-card" onClick={() => navigate('product-detail', product)}>
      <div className="product-img-wrap">
        {isImageSource(thumbnail)
          ? <img className="product-photo" src={thumbnail} alt={product.name || 'Sản phẩm'} loading="lazy" />
          : <div className="product-emoji">{thumbnail}</div>}
        {discountPct && <span className="product-badge badge-sale">-{discountPct}%</span>}
        {!inStock && <div className="out-of-stock">Hết hàng</div>}
      </div>
      <div className="product-body">
        <div className="product-brand">{product.brand}</div>
        <h3 className="product-name">{product.name}</h3>
        {active.length > 1 && <div className="variant-count">{active.length} lựa chọn</div>}
        <div className="product-meta">
          <div className="product-stars">
            {[1, 2, 3, 4, 5].map((star) => <span key={star} className={`star ${star <= Math.round(product.rating) ? '' : 'empty'}`}>★</span>)}
            <span className="review-count">({product.reviewCount})</span>
          </div>
          <span className="sold-count">Đã bán {product.sold}</span>
        </div>
        <div className="product-price-row">
          <span className="price-current">{formatPrice(minPrice)}</span>
          {hasDiscount && <span className="price-original">{formatPrice(product.basePrice)}</span>}
        </div>
        <button className="btn-add-cart" onClick={handleAdd} disabled={!inStock}>
          {inStock ? (needsVariantChoice ? 'Chọn phân loại' : '🛒 Thêm vào giỏ') : 'Hết hàng'}
        </button>
      </div>
    </div>
  );
}
