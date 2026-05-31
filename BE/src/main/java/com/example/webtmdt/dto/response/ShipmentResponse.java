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
public class ShipmentResponse {

    private Long id;
    private Long orderId;
    private String orderCode;
    private String orderStatus;
    private String shipmentStatus;
    private Long deliveryStaffId;
    private String deliveryStaffName;
    private String shippingName;
    private String shippingAddress;
    private String shippingPhone;
    private BigDecimal totalAmount;
    private String paymentStatus;
    private String paymentMethod;
    private List<OrderItemResponse> items;
    private LocalDateTime assignedAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private String failureReason;
    private LocalDateTime createdAt;
}
