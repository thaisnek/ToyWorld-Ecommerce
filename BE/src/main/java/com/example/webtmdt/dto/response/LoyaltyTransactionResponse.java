package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class LoyaltyTransactionResponse {

    private Long id;
    private Long orderId;
    private Long pointsChange;
    private Long balanceAfter;
    private String type;
    private String note;
    private LocalDateTime createdAt;
}
