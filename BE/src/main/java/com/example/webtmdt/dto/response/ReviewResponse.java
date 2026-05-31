package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ReviewResponse {

    private Long id;
    private Long productId;
    private String productName;
    private Long customerId;
    private String customerName;
    private Long orderItemId;
    private Integer rating;
    private String comment;
    private Boolean approved;
    private LocalDateTime createdAt;
}
