package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class ProductResponse {

    private Long id;
    private String name;
    private String description;
    private String brand;
    private String material;
    private BigDecimal basePrice;
    private String status;
    private Long sold;

    // Category info
    private Long categoryId;
    private String categoryName;

    // Supplier info
    private Long supplierId;
    private String supplierName;

    private List<ProductVariantResponse> variants;
    private List<ProductImageResponse> images;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
