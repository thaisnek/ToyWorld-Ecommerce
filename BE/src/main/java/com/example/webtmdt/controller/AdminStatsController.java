package com.example.webtmdt.controller;

import com.example.webtmdt.dto.response.AdminStatsResponse;
import com.example.webtmdt.dto.response.ApiResponse;
import com.example.webtmdt.dto.response.ProductSalesStatResponse;
import com.example.webtmdt.enums.OrderStatus;
import com.example.webtmdt.exception.AppException;
import com.example.webtmdt.repository.OrderRepository;
import com.example.webtmdt.repository.ProductRepository;
import com.example.webtmdt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
    public ResponseEntity<ApiResponse<AdminStatsResponse>> getStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        DateRange dateRange = toDateRange(fromDate, toDate);
        AdminStatsResponse stats = AdminStatsResponse.builder()
                .totalOrders(orderRepository.count())
                .totalProducts(productRepository.countByStatus(ACTIVE_PRODUCT_STATUS))
                .totalUsers(userRepository.count())
                .pendingOrders(orderRepository.countByOrderStatus(OrderStatus.PENDING))
                .revenue(orderRepository.sumTotalAmountByOrderStatusIn(List.of(OrderStatus.COMPLETED.name())))
                .topSellingProducts(getTopSellingProducts(5, dateRange))
                .lowSellingProducts(getLowSellingProducts(5, dateRange))
                .build();

        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê admin thành công!", stats));
    }

    @GetMapping("/products/top-selling")
    public ResponseEntity<ApiResponse<List<ProductSalesStatResponse>>> topSellingProducts(
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy sản phẩm bán chạy nhất thành công!",
                getTopSellingProducts(limit, toDateRange(fromDate, toDate))));
    }

    @GetMapping("/products/low-selling")
    public ResponseEntity<ApiResponse<List<ProductSalesStatResponse>>> lowSellingProducts(
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy sản phẩm bán ít nhất thành công!",
                getLowSellingProducts(limit, toDateRange(fromDate, toDate))));
    }

    private List<ProductSalesStatResponse> getTopSellingProducts(int limit, DateRange dateRange) {
        return productRepository.findTopSellingProducts(
                ACTIVE_PRODUCT_STATUS,
                SOLD_ORDER_STATUSES,
                dateRange.fromDateTime(),
                dateRange.toDateTime(),
                PageRequest.of(0, normalizeLimit(limit)));
    }

    private List<ProductSalesStatResponse> getLowSellingProducts(int limit, DateRange dateRange) {
        return productRepository.findLowSellingProducts(
                ACTIVE_PRODUCT_STATUS,
                SOLD_ORDER_STATUSES,
                dateRange.fromDateTime(),
                dateRange.toDateTime(),
                PageRequest.of(0, normalizeLimit(limit)));
    }

    private int normalizeLimit(int limit) {
        return Math.max(1, Math.min(limit, 50));
    }

    private DateRange toDateRange(LocalDate fromDate, LocalDate toDate) {
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "fromDate không được lớn hơn toDate");
        }

        return new DateRange(
                fromDate == null ? null : fromDate.atStartOfDay(),
                toDate == null ? null : toDate.plusDays(1).atStartOfDay());
    }

    private record DateRange(LocalDateTime fromDateTime, LocalDateTime toDateTime) {
    }
}
