package com.example.webtmdt.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ProductVariantRequest {

    private Long id;

    private String color;

    private String size;

    @DecimalMin(value = "0", message = "Gia ban khong duoc am")
    private BigDecimal priceOverride;

    @Min(value = 0, message = "Số lượng tồn kho không được âm")
    private Integer stockQuantity = 0;

    private Boolean active = true;
}
