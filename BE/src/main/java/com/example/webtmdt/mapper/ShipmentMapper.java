package com.example.webtmdt.mapper;

import com.example.webtmdt.dto.response.ShipmentResponse;
import com.example.webtmdt.entity.Shipment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ShipmentMapper {

    @Mapping(source = "order.id", target = "orderId")
    @Mapping(source = "order.orderCode", target = "orderCode")
    @Mapping(source = "order.orderStatus", target = "orderStatus")
    @Mapping(source = "order.shippingName", target = "shippingName")
    @Mapping(source = "order.shippingAddress", target = "shippingAddress")
    @Mapping(source = "order.shippingPhone", target = "shippingPhone")
    @Mapping(source = "order.totalAmount", target = "totalAmount")
    @Mapping(source = "order.paymentStatus", target = "paymentStatus")
    @Mapping(source = "order.payment.paymentMethod", target = "paymentMethod")
    @Mapping(source = "deliveryStaff.id", target = "deliveryStaffId")
    @Mapping(source = "deliveryStaff.fullName", target = "deliveryStaffName")
    @Mapping(target = "items", ignore = true)
    ShipmentResponse toResponse(Shipment shipment);
}
