package com.example.webtmdt.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class VoucherRequest {

    @NotNull(message = "ID loại voucher không được để trống")
    private Long typeVoucherId;

    @NotBlank(message = "Mã voucher không được để trống")
    private String codeVoucher;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDateTime fromDate;

    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDateTime toDate;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng ít nhất phải là 1")
    private Integer quantity;
}
