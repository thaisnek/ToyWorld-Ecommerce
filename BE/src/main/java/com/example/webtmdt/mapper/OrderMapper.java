package com.example.webtmdt.mapper;

import com.example.webtmdt.dto.response.OrderItemResponse;
import com.example.webtmdt.dto.response.OrderResponse;
import com.example.webtmdt.entity.Order;
import com.example.webtmdt.entity.OrderItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface OrderMapper {

    @Mapping(source = "customer.id", target = "customerId")
    @Mapping(source = "customer.fullName", target = "customerName")
    @Mapping(source = "voucher.codeVoucher", target = "voucherCode")
    @Mapping(target = "items", ignore = true)
    @Mapping(target = "paymentMethod", ignore = true)
    @Mapping(target = "momoPayUrl", ignore = true)
    @Mapping(target = "paymentUrl", ignore = true)
    OrderResponse toResponse(Order order);

    @Mapping(source = "variant.id", target = "variantId")
    @Mapping(source = "variant.product.id", target = "productId")
    @Mapping(target = "imageUrl", ignore = true)
    OrderItemResponse toItemResponse(OrderItem orderItem);

    List<OrderItemResponse> toItemResponseList(List<OrderItem> items);
}
