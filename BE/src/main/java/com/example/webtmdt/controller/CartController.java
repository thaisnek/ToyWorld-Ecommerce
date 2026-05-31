package com.example.webtmdt.controller;

import com.example.webtmdt.dto.request.AddToCartRequest;
import com.example.webtmdt.dto.response.ApiResponse;
import com.example.webtmdt.dto.response.CartResponse;
import com.example.webtmdt.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class CartController {

    private final CartService cartService;

    // ==================== READ ====================

    /**
     * Lấy giỏ hàng của user hiện tại
     * GET /api/cart
     */
    @GetMapping
    public ResponseEntity<ApiResponse<CartResponse>> getCart(
            @AuthenticationPrincipal UserDetails userDetails) {
        CartResponse cart = cartService.getCart(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Lấy giỏ hàng thành công!", cart));
    }

    /**
     * Đếm số lượng item trong giỏ (dùng cho badge)
     * GET /api/cart/count
     */
    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Integer>> getCartItemCount(
            @AuthenticationPrincipal UserDetails userDetails) {
        Integer count = cartService.getCartItemCount(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Lấy số lượng giỏ hàng thành công!", count));
    }

    // ==================== ADD ====================

    /**
     * Thêm sản phẩm vào giỏ hàng
     * POST /api/cart
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CartResponse>> addToCart(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AddToCartRequest request) {
        CartResponse cart = cartService.addToCart(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Đã thêm vào giỏ hàng!", cart));
    }

    // ==================== UPDATE ====================

    /**
     * Cập nhật số lượng item trong giỏ
     * PUT /api/cart/items/{itemId}?quantity=3
     */
    @PutMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartResponse>> updateQuantity(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long itemId,
            @RequestParam Integer quantity) {
        CartResponse cart = cartService.updateCartItem(userDetails.getUsername(), itemId, quantity);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật giỏ hàng thành công!", cart));
    }

    // ==================== DELETE ====================

    /**
     * Xóa 1 item khỏi giỏ hàng
     * DELETE /api/cart/items/{itemId}
     */
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartResponse>> removeCartItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long itemId) {
        CartResponse cart = cartService.removeCartItem(userDetails.getUsername(), itemId);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa sản phẩm khỏi giỏ hàng!", cart));
    }

    /**
     * Xóa toàn bộ giỏ hàng
     * DELETE /api/cart
     */
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearCart(
            @AuthenticationPrincipal UserDetails userDetails) {
        cartService.clearCart(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Đã xóa toàn bộ giỏ hàng!", null));
    }
}
