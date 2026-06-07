package com.example.webtmdt.controller;

import com.example.webtmdt.dto.response.ApiResponse;
import com.example.webtmdt.dto.response.PaymentResponse;
import com.example.webtmdt.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

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
     * VNPay ReturnUrl. Backend verifies the signature, updates payment state,
     * then redirects the browser to the frontend result page.
     */
    @GetMapping("/api/payments/vnpay/return")
    public RedirectView handleVnpayReturn(@RequestParam Map<String, String> params) {
        return new RedirectView(paymentService.handleVnpayReturn(params));
    }

    /**
     * VNPay IPN callback. Configure this URL on the VNPay merchant portal when public.
     */
    @GetMapping("/api/payments/vnpay/ipn")
    public ResponseEntity<Map<String, String>> handleVnpayIpn(@RequestParam Map<String, String> params) {
        return ResponseEntity.ok(paymentService.handleVnpayIpn(params));
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
    @PostMapping("/api/payments/order/{orderId}/retry")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<PaymentResponse>> retryOnlinePayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long orderId,
            HttpServletRequest httpRequest) {
        PaymentResponse payment = paymentService.retryOnlinePayment(
                orderId,
                userDetails.getUsername(),
                resolveClientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Tao lai link thanh toan thanh cong!", payment));
    }

    @PutMapping("/api/admin/payments/{orderId}/confirm-cod")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES_STAFF')")
    public ResponseEntity<ApiResponse<PaymentResponse>> confirmCodPayment(
            @PathVariable Long orderId) {
        PaymentResponse payment = paymentService.confirmCodPayment(orderId);
        return ResponseEntity.ok(ApiResponse.success("Xác nhận thanh toán COD thành công!", payment));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }
}
