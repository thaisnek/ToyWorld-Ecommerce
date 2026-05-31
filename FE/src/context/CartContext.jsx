import { createContext, useContext, useState, useEffect } from 'react';
import { cartApi } from '../services/api';
import { useAuth } from './AuthContext';
import { getProductThumbnail } from '../utils/imageUtils';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);  // = CartItems[]

  const getCartItemId = (item) => item?.id ?? item?.cartItemId;
  const getVariantId = (variant) => variant?.id ?? variant?.variantId;
  const getVariantPrice = (product, variant) => variant?.priceOverride ?? product?.basePrice ?? 0;
  const findCartItem = (variantIdOrItemId) =>
    cart.find(item =>
      String(item.variantId) === String(variantIdOrItemId) ||
      String(getCartItemId(item)) === String(variantIdOrItemId)
    );

  // Load giỏ từ server nếu đã login, ngược lại từ localStorage
  useEffect(() => {
    if (user) {
      cartApi.get().then(data => setCart(data.items || [])).catch(() => {});
    } else {
      const saved = localStorage.getItem('tw_cart');
      setCart(saved ? JSON.parse(saved) : []);
    }
  }, [user]);

  // Lưu local khi chưa login
  useEffect(() => {
    if (!user) localStorage.setItem('tw_cart', JSON.stringify(cart));
  }, [cart, user]);

  const addToCart = async (product, variant, quantity = 1) => {
    const variantId = getVariantId(variant);
    if (!variantId) throw new Error('Vui lòng chọn phân loại sản phẩm');

    if (user) {
      const data = await cartApi.add({ variantId, quantity });
      setCart(data.items || []);
    } else {
      setCart(prev => {
        const exists = prev.find(i => String(i.variantId) === String(variantId));
        if (exists) return prev.map(i => String(i.variantId) === String(variantId)
          ? { ...i, quantity: Math.min(i.quantity + quantity, variant.stockQuantity) } : i);
        return [...prev, {
          cartItemId: Date.now(), productId: product.id,
          variantId, productName: product.name,
          color: variant.color || 'Mặc định', size: variant.size || '', unitPrice: getVariantPrice(product, variant),
          imageUrl: getProductThumbnail(product),
          quantity, stockQuantity: variant.stockQuantity,
        }];
      });
    }
  };

  const removeFromCart = async (variantId) => {
    if (user) {
      const item = findCartItem(variantId);
      const data = await cartApi.remove(getCartItemId(item) ?? variantId);
      setCart(data.items || []);
    } else {
      setCart(prev => prev.filter(i => String(i.variantId) !== String(variantId)));
    }
  };

  const updateQuantity = async (variantId, qty) => {
    if (qty < 1) { removeFromCart(variantId); return; }
    if (user) {
      const item = findCartItem(variantId);
      const data = await cartApi.update({ itemId: getCartItemId(item) ?? variantId, quantity: qty });
      setCart(data.items || []);
    } else {
      setCart(prev => prev.map(i => String(i.variantId) === String(variantId) ? { ...i, quantity: qty } : i));
    }
  };

  const clearCart = async () => {
    if (user) await cartApi.clear();
    setCart([]);
  };

  const refreshCart = async () => {
    if (user) {
      const data = await cartApi.get();
      const items = data.items || [];
      setCart(items);
      return items;
    }

    const saved = localStorage.getItem('tw_cart');
    const items = saved ? JSON.parse(saved) : [];
    setCart(items);
    return items;
  };

  // Normalize item field (server dùng imageUrl, local dùng emoji)
  const getEmoji = (item) => item.imageUrl || item.emoji || '🧸';

  const subtotal = cart.reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 0), 0);
  const count    = cart.reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart, subtotal, total: subtotal, count, getEmoji }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

