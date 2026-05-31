package com.example.webtmdt.controller;

import com.example.webtmdt.dto.response.AdminStatsResponse;
import com.example.webtmdt.dto.response.ApiResponse;
import com.example.webtmdt.dto.response.ProductSalesStatResponse;
import com.example.webtmdt.enums.OrderStatus;
import com.example.webtmdt.repository.OrderRepository;
import com.example.webtmdt.repository.ProductRepository;
import com.example.webtmdt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SALES_STAFF')")
public class AdminStatsController {

    private static final String ACTIVE_PRODUCT_STATUS = "ACTIVE";
    private static final List<OrderStatus> SOLD_ORDER_STATUSES = List.of(
            OrderStatus.COMPLETED
    );

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<AdminStatsResponse>> getStats() {
        AdminStatsResponse stats = AdminStatsResponse.builder()
                .totalOrders(orderRepository.count())
                .totalProducts(productRepository.countByStatus(ACTIVE_PRODUCT_STATUS))
                .totalUsers(userRepository.count())
                .pendingOrders(orderRepository.countByOrderStatus(OrderStatus.PENDING))
                .revenue(orderRepository.sumTotalAmountByOrderStatusIn(List.of(OrderStatus.COMPLETED.name())))
                .topSellingProducts(getTopSellingProducts(5))
                .lowSellingProducts(getLowSellingProducts(5))
                .build();

        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê admin thành công!", stats));
    }

    @GetMapping("/products/top-selling")
    public ResponseEntity<ApiResponse<List<ProductSalesStatResponse>>> topSellingProducts(
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy sản phẩm bán chạy nhất thành công!",
                getTopSellingProducts(limit)));
    }

    @GetMapping("/products/low-selling")
    public ResponseEntity<ApiResponse<List<ProductSalesStatResponse>>> lowSellingProducts(
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy sản phẩm bán ít nhất thành công!",
                getLowSellingProducts(limit)));
    }

    private List<ProductSalesStatResponse> getTopSellingProducts(int limit) {
        return productRepository.findTopSellingProducts(
                ACTIVE_PRODUCT_STATUS,
                SOLD_ORDER_STATUSES,
                PageRequest.of(0, normalizeLimit(limit)));
    }

    private List<ProductSalesStatResponse> getLowSellingProducts(int limit) {
        return productRepository.findLowSellingProducts(
                ACTIVE_PRODUCT_STATUS,
                SOLD_ORDER_STATUSES,
                PageRequest.of(0, normalizeLimit(limit)));
    }

    private int normalizeLimit(int limit) {
        return Math.max(1, Math.min(limit, 50));
    }
}
