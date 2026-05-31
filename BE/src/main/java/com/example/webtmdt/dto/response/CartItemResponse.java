package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class CartItemResponse {

    private Long id;
    private Long variantId;
    private Long productId;
    private String productName;
    private String color;
    private String size;
    private String imageUrl;
    private BigDecimal unitPrice;
    private Integer quantity;
}
