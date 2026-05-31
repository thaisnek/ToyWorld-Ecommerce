package com.example.webtmdt.controller;

import com.example.webtmdt.dto.response.ApiResponse;
import com.example.webtmdt.dto.response.PaymentResponse;
import com.example.webtmdt.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * MoMo IPN Callback (public endpoint)
     */
    @PostMapping("/api/payments/momo/callback")
    public ResponseEntity<Void> handleMomoCallback(@RequestBody Map<String, String> params) {
        paymentService.handleMomoCallback(params);
        return ResponseEntity.noContent().build();
    }

    /**
     * Lấy thông tin thanh toán theo đơn hàng (chủ đơn hàng hoặc ADMIN/SALES_STAFF)
     */
    @GetMapping("/api/payments/order/{orderId}")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentByOrderId(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long orderId) {
        PaymentResponse payment = paymentService.getPaymentByOrderId(orderId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thanh toán thành công!", payment));
    }

    /**
     * Admin xác nhận đã nhận tiền COD
     */
    @PutMapping("/api/admin/payments/{orderId}/confirm-cod")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES_STAFF')")
    public ResponseEntity<ApiResponse<PaymentResponse>> confirmCodPayment(
            @PathVariable Long orderId) {
        PaymentResponse payment = paymentService.confirmCodPayment(orderId);
        return ResponseEntity.ok(ApiResponse.success("Xác nhận thanh toán COD thành công!", payment));
    }
}
