package com.example.webtmdt.mapper;

import com.example.webtmdt.dto.response.CartItemResponse;
import com.example.webtmdt.dto.response.CartResponse;
import com.example.webtmdt.entity.Cart;
import com.example.webtmdt.entity.CartItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * MapStruct Mapper cho Cart + CartItem.
 *
 * Lưu ý: CartItemResponse có 2 field cần business logic:
 * - unitPrice: chọn variant.priceOverride hoặc product.basePrice
 * - imageUrl: tra cứu từ ProductImageRepository
 * → Hai field này được map thủ công trong CartServiceImpl, mapper chỉ ignore chúng.
 */
@Mapper(componentModel = "spring")
public interface CartMapper {

    @Mapping(source = "customer.id", target = "customerId")
    @Mapping(target = "items", ignore = true)      // map thủ công vì cần tính unitPrice, imageUrl
    @Mapping(target = "itemCount", ignore = true)   // tính trong service
    @Mapping(target = "totalAmount", ignore = true) // tính trong service
    CartResponse toResponse(Cart cart);

    @Mapping(source = "variant.id", target = "variantId")
    @Mapping(source = "variant.product.id", target = "productId")
    @Mapping(source = "variant.product.name", target = "productName")
    @Mapping(source = "variant.color", target = "color")
    @Mapping(source = "variant.size", target = "size")
    @Mapping(target = "unitPrice", ignore = true)   // cần logic: priceOverride ?? basePrice
    @Mapping(target = "imageUrl", ignore = true)     // cần tra cứu DB
    CartItemResponse toItemResponse(CartItem cartItem);

    List<CartItemResponse> toItemResponseList(List<CartItem> items);
}
