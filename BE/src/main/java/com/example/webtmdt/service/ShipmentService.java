package com.example.webtmdt.service;

import com.example.webtmdt.dto.request.AssignShipmentRequest;
import com.example.webtmdt.dto.request.UpdateShipmentStatusRequest;
import com.example.webtmdt.dto.response.ShipmentResponse;
import com.example.webtmdt.enums.ShipmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ShipmentService {

    ShipmentResponse assignDeliveryStaff(Long orderId, AssignShipmentRequest request);

    ShipmentResponse updateShipmentStatus(String username, Long shipmentId, UpdateShipmentStatusRequest request);

    ShipmentResponse getShipmentByOrderId(String username, Long orderId);

    Page<ShipmentResponse> getAllShipments(ShipmentStatus status, Long deliveryStaffId, Pageable pageable);

    Page<ShipmentResponse> getMyAssignedShipments(String username, ShipmentStatus status, Pageable pageable);
}
