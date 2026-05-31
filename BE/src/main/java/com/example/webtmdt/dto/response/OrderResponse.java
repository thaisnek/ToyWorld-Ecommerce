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
public class OrderResponse {

    private Long id;
    private String orderCode;

    private Long customerId;
    private String customerName;

    private String shippingName;
    private String shippingAddress;
    private String shippingPhone;

    private String orderStatus;
    private String paymentStatus;
    private String shippingStatus;
    private String paymentMethod;

    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;

    private String cancelReason;
    private String voucherCode;

    /** Chỉ có khi paymentMethod = MOMO và chưa thanh toán */
    private String momoPayUrl;

    private List<OrderItemResponse> items;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
