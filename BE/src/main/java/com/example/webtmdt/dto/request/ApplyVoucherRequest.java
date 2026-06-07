package com.example.webtmdt.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ApplyVoucherRequest {

    @NotBlank(message = "Ma voucher khong duoc de trong")
    private String voucherCode;

    @NotNull(message = "Tam tinh don hang khong duoc de trong")
    @DecimalMin(value = "0.01", message = "Tam tinh don hang phai lon hon 0")
    private BigDecimal subtotal;
}
