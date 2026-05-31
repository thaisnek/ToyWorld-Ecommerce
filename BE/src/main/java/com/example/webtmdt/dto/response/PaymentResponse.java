package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class PaymentResponse {

    private Long id;
    private Long orderId;
    private String paymentMethod;
    private String paymentStatus;
    private BigDecimal amount;
    private String providerTransactionId;
    private String providerName;
    private LocalDateTime paidAt;
    private String failureReason;
    private String momoPayUrl;
    private LocalDateTime createdAt;
}
