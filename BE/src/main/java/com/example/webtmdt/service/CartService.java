package com.example.webtmdt.service;

import com.example.webtmdt.dto.request.AddToCartRequest;
import com.example.webtmdt.dto.response.CartResponse;

public interface CartService {

    CartResponse getCart(String username);

    CartResponse addToCart(String username, AddToCartRequest request);

    CartResponse updateCartItem(String username, Long itemId, Integer quantity);

    CartResponse removeCartItem(String username, Long itemId);

    void clearCart(String username);

    Integer getCartItemCount(String username);
}
