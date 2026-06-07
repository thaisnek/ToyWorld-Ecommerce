package com.example.webtmdt.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class ApplyVoucherResponse {

    private String codeVoucher;
    private String typeVoucher;
    private BigDecimal value;
    private BigDecimal minValue;
    private BigDecimal maxValue;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal totalAfterDiscount;
}
