package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class TypeVoucherResponse {

    private Long id;
    private String typeVoucher;
    private BigDecimal value;
    private BigDecimal maxValue;
    private BigDecimal minValue;
    private LocalDateTime createdAt;
}
