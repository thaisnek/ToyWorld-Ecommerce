package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class ProductVariantResponse {

    private Long id;
    private String color;
    private String size;
    private BigDecimal priceOverride;
    private Integer stockQuantity;
    private Boolean active;
}
