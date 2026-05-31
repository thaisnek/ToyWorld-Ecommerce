package com.example.webtmdt.service.impl;

import com.example.webtmdt.dto.request.AddToCartRequest;
import com.example.webtmdt.dto.response.CartItemResponse;
import com.example.webtmdt.dto.response.CartResponse;
import com.example.webtmdt.entity.Cart;
import com.example.webtmdt.entity.CartItem;
import com.example.webtmdt.entity.ProductVariant;
import com.example.webtmdt.entity.User;
import com.example.webtmdt.exception.AppException;
import com.example.webtmdt.exception.ResourceNotFoundException;
import com.example.webtmdt.repository.CartItemRepository;
import com.example.webtmdt.repository.CartRepository;
import com.example.webtmdt.repository.ProductImageRepository;
import com.example.webtmdt.repository.ProductVariantRepository;
import com.example.webtmdt.repository.UserRepository;
import com.example.webtmdt.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductImageRepository productImageRepository;
    private final com.example.webtmdt.mapper.CartMapper cartMapper;

    // ==================== READ ====================

    @Override
    @Transactional(readOnly = true)
    public CartResponse getCart(String username) {
        User user = findUserOrThrow(username);

        Cart cart = cartRepository.findByCustomerId(user.getId()).orElse(null);
        if (cart == null) {
            return CartResponse.builder()
                    .customerId(user.getId())
                    .items(List.of())
                    .itemCount(0)
                    .totalAmount(BigDecimal.ZERO)
                    .build();
        }

        return toCartResponse(cart);
    }

    @Override
    @Transactional(readOnly = true)
    public Integer getCartItemCount(String username) {
        User user = findUserOrThrow(username);

        Cart cart = cartRepository.findByCustomerId(user.getId()).orElse(null);
        if (cart == null) {
            return 0;
        }

        return cart.getItems().stream()
                .mapToInt(CartItem::getQuantity)
                .sum();
    }

    // ==================== ADD TO CART ====================

    @Override
    @Transactional
    public CartResponse addToCart(String username, AddToCartRequest request) {
        User user = findUserOrThrow(username);

        ProductVariant variant = productVariantRepository.findById(request.getVariantId())
                .orElseThrow(() -> new ResourceNotFoundException("Phân loại sản phẩm", "id", request.getVariantId()));

        if (!Boolean.TRUE.equals(variant.getActive())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Sản phẩm này đã ngừng kinh doanh");
        }

        Cart cart = cartRepository.findByCustomerId(user.getId())
                .orElseGet(() -> {
                    Cart newCart = Cart.builder().customer(user).build();
                    return cartRepository.save(newCart);
                });

        CartItem cartItem = cartItemRepository.findByCartIdAndVariantId(cart.getId(), variant.getId())
                .orElse(null);

        int newQuantity = request.getQuantity();
        if (cartItem != null) {
            newQuantity += cartItem.getQuantity();
        }

        // Soft check số lượng tồn kho
        if (newQuantity > variant.getStockQuantity()) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Không đủ hàng trong kho. Số lượng hiện có: " + variant.getStockQuantity());
        }

        if (cartItem != null) {
            cartItem.setQuantity(newQuantity);
        } else {
            cartItem = CartItem.builder()
                    .cart(cart)
                    .variant(variant)
                    .quantity(newQuantity)
                    .build();
            cart.getItems().add(cartItem);
        }

        cartItemRepository.save(cartItem);

        return toCartResponse(cart);
    }

    // ==================== UPDATE ====================

    @Override
    @Transactional
    public CartResponse updateCartItem(String username, Long itemId, Integer quantity) {
        User user = findUserOrThrow(username);

        Cart cart = cartRepository.findByCustomerId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Giỏ hàng", "customerId", user.getId()));

        CartItem cartItem = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Mục trong giỏ", "id", itemId));

        if (!cartItem.getCart().getId().equals(cart.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền sửa giỏ hàng này");
        }

        if (quantity <= 0) {
            cartItemRepository.delete(cartItem);
            cart.getItems().remove(cartItem);
        } else {
            // Soft check tồn kho
            if (quantity > cartItem.getVariant().getStockQuantity()) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Không đủ hàng trong kho. Số lượng hiện có: " + cartItem.getVariant().getStockQuantity());
            }
            cartItem.setQuantity(quantity);
            cartItemRepository.save(cartItem);
        }

        return toCartResponse(cart);
    }

    // ==================== DELETE ====================

    @Override
    @Transactional
    public CartResponse removeCartItem(String username, Long itemId) {
        return updateCartItem(username, itemId, 0);
    }

    @Override
    @Transactional
    public void clearCart(String username) {
        User user = findUserOrThrow(username);

        Cart cart = cartRepository.findByCustomerId(user.getId()).orElse(null);
        if (cart != null) {
            cart.getItems().clear();
            cartRepository.save(cart);
        }
    }

    // ==================== HELPER METHODS ====================

    private User findUserOrThrow(String username) {
        return userRepository.findByUserName(username)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "username", username));
    }

    private CartResponse toCartResponse(Cart cart) {
        CartResponse response = cartMapper.toResponse(cart);

        List<CartItemResponse> itemResponses = cart.getItems().stream()
                .map(item -> {
                    CartItemResponse itemResponse = cartMapper.toItemResponse(item);

                    ProductVariant variant = item.getVariant();
                    BigDecimal price = variant.getPriceOverride() != null
                            ? variant.getPriceOverride()
                            : variant.getProduct().getBasePrice();

                    String imageUrl = productImageRepository.findByProductIdAndThumbnailTrue(variant.getProduct().getId())
                            .map(img -> img.getImageUrl())
                            .orElse(null);

                    itemResponse.setUnitPrice(price);
                    itemResponse.setImageUrl(imageUrl);
                    return itemResponse;
                })
                .collect(Collectors.toList());

        response.setItems(itemResponses);

        // Tính tổng tiền
        BigDecimal totalAmount = itemResponses.stream()
                .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        response.setTotalAmount(totalAmount);

        // Tổng số lượng items
        int itemCount = itemResponses.stream()
                .mapToInt(CartItemResponse::getQuantity)
                .sum();
        response.setItemCount(itemCount);

        return response;
    }
}
