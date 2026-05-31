package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
public class CartResponse {

    private Long id;
    private Long customerId;
    private List<CartItemResponse> items;
    private Integer itemCount;
    private BigDecimal totalAmount;
}
