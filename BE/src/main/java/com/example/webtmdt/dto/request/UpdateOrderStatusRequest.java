package com.example.webtmdt.dto.request;

import com.example.webtmdt.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateOrderStatusRequest {

    @NotNull(message = "Trạng thái đơn hàng không được để trống")
    private OrderStatus orderStatus;

    /** Bắt buộc khi orderStatus = CANCELLED */
    private String cancelReason;
}
