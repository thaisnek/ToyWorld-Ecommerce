package com.example.webtmdt.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductSalesStatResponse {

    private Long productId;
    private String productName;
    private String categoryName;
    private Long soldQuantity;
}
