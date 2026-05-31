package com.example.webtmdt.dto.request;

import com.example.webtmdt.enums.VoucherType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class TypeVoucherRequest {

    @NotNull(message = "Loại voucher không được để trống")
    private VoucherType typeVoucher;

    @NotNull(message = "Giá trị giảm không được để trống")
    @DecimalMin(value = "0", message = "Giá trị giảm phải lớn hơn hoặc bằng 0")
    private BigDecimal value;

    /** Giá trị giảm tối đa (cho PERCENTAGE) */
    private BigDecimal maxValue;

    /** Giá trị đơn hàng tối thiểu */
    private BigDecimal minValue;
}
