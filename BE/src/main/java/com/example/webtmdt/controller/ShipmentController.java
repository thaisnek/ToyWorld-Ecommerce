package com.example.webtmdt.controller;

import com.example.webtmdt.dto.request.AssignShipmentRequest;
import com.example.webtmdt.dto.request.UpdateShipmentStatusRequest;
import com.example.webtmdt.dto.response.ApiResponse;
import com.example.webtmdt.dto.response.ShipmentResponse;
import com.example.webtmdt.enums.ShipmentStatus;
import com.example.webtmdt.service.ShipmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ShipmentController {

    private final ShipmentService shipmentService;

    @GetMapping("/api/admin/shipments")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES_STAFF')")
    public ResponseEntity<ApiResponse<Page<ShipmentResponse>>> getAllShipments(
            @RequestParam(required = false) ShipmentStatus status,
            @RequestParam(required = false) Long deliveryStaffId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ShipmentResponse> shipments = shipmentService.getAllShipments(status, deliveryStaffId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Get shipments successfully", shipments));
    }

    /**
     * Admin/Sales: Phân công nhân viên giao hàng
     */
    @PutMapping("/api/admin/shipments/{orderId}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES_STAFF')")
    public ResponseEntity<ApiResponse<ShipmentResponse>> assignDeliveryStaff(
            @PathVariable Long orderId,
            @Valid @RequestBody AssignShipmentRequest request) {
        ShipmentResponse shipment = shipmentService.assignDeliveryStaff(orderId, request);
        return ResponseEntity.ok(ApiResponse.success("Phân công giao hàng thành công!", shipment));
    }

    /**
     * Admin/Sales/Shipper: Cập nhật trạng thái vận chuyển
     */
    @PutMapping("/api/shipments/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'DELIVERY_STAFF')")
    public ResponseEntity<ApiResponse<ShipmentResponse>> updateShipmentStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateShipmentStatusRequest request) {
        ShipmentResponse shipment = shipmentService.updateShipmentStatus(userDetails.getUsername(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái giao hàng thành công!", shipment));
    }

    /**
     * Lấy thông tin vận chuyển theo đơn hàng (ADMIN/SALES_STAFF/DELIVERY_STAFF)
     */
    @GetMapping("/api/shipments/order/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES_STAFF', 'DELIVERY_STAFF')")
    public ResponseEntity<ApiResponse<ShipmentResponse>> getShipmentByOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long orderId) {
        ShipmentResponse shipment = shipmentService.getShipmentByOrderId(userDetails.getUsername(), orderId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin vận chuyển thành công!", shipment));
    }

    /**
     * Shipper: Lấy danh sách đơn được phân công
     */
    @GetMapping("/api/shipments/my-assignments")
    @PreAuthorize("hasRole('DELIVERY_STAFF')")
    public ResponseEntity<ApiResponse<Page<ShipmentResponse>>> getMyAssignments(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) ShipmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("assignedAt").descending());
        Page<ShipmentResponse> shipments = shipmentService.getMyAssignedShipments(userDetails.getUsername(), status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn giao hàng thành công!", shipments));
    }
}
