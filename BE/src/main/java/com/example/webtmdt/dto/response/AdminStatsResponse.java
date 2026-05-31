package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
public class AdminStatsResponse {

    private Long totalOrders;
    private Long totalProducts;
    private Long totalUsers;
    private Long pendingOrders;
    private BigDecimal revenue;
    private List<ProductSalesStatResponse> topSellingProducts;
    private List<ProductSalesStatResponse> lowSellingProducts;
}
