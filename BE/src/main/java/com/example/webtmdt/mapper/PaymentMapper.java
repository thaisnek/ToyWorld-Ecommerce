package com.example.webtmdt.mapper;

import com.example.webtmdt.dto.response.PaymentResponse;
import com.example.webtmdt.entity.Payment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PaymentMapper {

    @Mapping(source = "order.id", target = "orderId")
    @Mapping(target = "momoPayUrl", ignore = true)
    @Mapping(target = "paymentUrl", ignore = true)
    PaymentResponse toResponse(Payment payment);
}
