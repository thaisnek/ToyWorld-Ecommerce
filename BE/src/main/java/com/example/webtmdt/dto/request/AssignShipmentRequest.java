package com.example.webtmdt.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssignShipmentRequest {

    @NotNull(message = "ID nhân viên giao hàng không được để trống")
    private Long deliveryStaffId;
}
