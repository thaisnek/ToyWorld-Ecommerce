package com.example.webtmdt.service.impl;

import com.example.webtmdt.configuration.MomoConfig;
import com.example.webtmdt.dto.response.PaymentResponse;
import com.example.webtmdt.entity.Order;
import com.example.webtmdt.entity.OrderItem;
import com.example.webtmdt.entity.Payment;
import com.example.webtmdt.entity.ProductVariant;
import com.example.webtmdt.enums.PaymentMethod;
import com.example.webtmdt.enums.PaymentStatus;
import com.example.webtmdt.enums.OrderStatus;
import com.example.webtmdt.enums.ShipmentStatus;
import com.example.webtmdt.exception.AppException;
import com.example.webtmdt.exception.ResourceNotFoundException;
import com.example.webtmdt.mapper.PaymentMapper;
import com.example.webtmdt.repository.OrderRepository;
import com.example.webtmdt.repository.PaymentRepository;
import com.example.webtmdt.repository.ProductVariantRepository;
import com.example.webtmdt.repository.ShipmentRepository;
import com.example.webtmdt.repository.VoucherRepository;
import com.example.webtmdt.repository.VoucherUsedRepository;
import com.example.webtmdt.service.PaymentService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final ProductVariantRepository variantRepository;
    private final ShipmentRepository shipmentRepository;
    private final VoucherRepository voucherRepository;
    private final VoucherUsedRepository voucherUsedRepository;
    private final PaymentMapper paymentMapper;
    private final MomoConfig momoConfig;
    private final ObjectMapper objectMapper;

    // ==================== MOMO PAYMENT ====================

    @Override
    public String createMomoPayment(Order order) {
        try {
            String requestId = UUID.randomUUID().toString();
            String orderId = order.getOrderCode();
            String amount = order.getTotalAmount().toBigInteger().toString();
            String orderInfo = "Thanh toán đơn hàng " + order.getOrderCode();
            String requestType = "payWithMethod";
            String extraData = "";

            // Tạo raw signature
            String rawSignature = "accessKey=" + momoConfig.getAccessKey()
                    + "&amount=" + amount
                    + "&extraData=" + extraData
                    + "&ipnUrl=" + momoConfig.getIpnUrl()
                    + "&orderId=" + orderId
                    + "&orderInfo=" + orderInfo
                    + "&partnerCode=" + momoConfig.getPartnerCode()
                    + "&redirectUrl=" + momoConfig.getRedirectUrl()
                    + "&requestId=" + requestId
                    + "&requestType=" + requestType;

            String signature = hmacSHA256(momoConfig.getSecretKey(), rawSignature);

            // Tạo request body
            Map<String, Object> bodyMap = new HashMap<>();
            bodyMap.put("partnerCode", momoConfig.getPartnerCode());
            bodyMap.put("partnerName", "WebTMDT");
            bodyMap.put("storeId", "WebTMDTStore");
            bodyMap.put("requestId", requestId);
            bodyMap.put("amount", Long.parseLong(amount));
            bodyMap.put("orderId", orderId);
            bodyMap.put("orderInfo", orderInfo);
            bodyMap.put("redirectUrl", momoConfig.getRedirectUrl());
            bodyMap.put("ipnUrl", momoConfig.getIpnUrl());
            bodyMap.put("lang", "vi");
            bodyMap.put("requestType", requestType);
            bodyMap.put("autoCapture", true);
            bodyMap.put("extraData", extraData);
            bodyMap.put("signature", signature);

            String requestBody = objectMapper.writeValueAsString(bodyMap);

            // Gửi request tới MoMo
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(momoConfig.getEndpoint()))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> httpResponse = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            JsonNode responseNode = objectMapper.readTree(httpResponse.body());

            int resultCode = responseNode.get("resultCode").asInt();
            if (resultCode == 0) {
                return responseNode.get("payUrl").asText();
            } else {
                String message = responseNode.has("message") ? responseNode.get("message").asText() : "MoMo resultCode: " + resultCode;
                log.warn("MoMo create payment failed for order {}: {}", orderId, message);
                throw new AppException(HttpStatus.BAD_REQUEST, "Khong tao duoc thanh toan MoMo: " + message);
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("MoMo payment exception", e);
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi kết nối cổng thanh toán MoMo");
        }
    }

    @Override
    @Transactional
    public void handleMomoCallback(Map<String, String> params) {
        try {
            if (!isValidMomoSignature(params)) {
                log.warn("Rejected MoMo callback with invalid signature for orderId={}", params.get("orderId"));
                return;
            }

            String orderId = params.get("orderId");
            int resultCode = Integer.parseInt(params.get("resultCode"));
            String transId = params.get("transId");
            BigDecimal amount = new BigDecimal(params.get("amount"));

            Order order = orderRepository.findByOrderCode(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng", "orderCode", orderId));

            Payment payment = paymentRepository.findByOrderId(order.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Thanh toán", "orderId", order.getId()));

            if (resultCode == 0) {
                if (payment.getPaymentStatus() == PaymentStatus.PAID) {
                    log.info("Ignoring duplicate paid MoMo callback for order {}", orderId);
                    return;
                }
                if (payment.getPaymentStatus() == PaymentStatus.CANCELLED || payment.getPaymentStatus() == PaymentStatus.REFUNDED) {
                    log.warn("Ignoring MoMo paid callback for closed order {}", orderId);
                    return;
                }
                if (amount.compareTo(order.getTotalAmount()) != 0) {
                    log.warn("Rejected MoMo callback for order {} because amount {} != {}", orderId, amount, order.getTotalAmount());
                    return;
                }

                // Thanh toán thành công
                payment.setPaymentStatus(PaymentStatus.PAID);
                payment.setPaidAt(LocalDateTime.now());
                payment.setProviderTransactionId(transId);
                payment.setProviderName("MOMO");
                order.setPaymentStatus(PaymentStatus.PAID);
            } else {
                if (payment.getPaymentStatus() == PaymentStatus.PAID) {
                    log.info("Ignoring failed MoMo callback for already paid order {}", orderId);
                    return;
                }
                if (payment.getPaymentStatus() == PaymentStatus.CANCELLED || payment.getPaymentStatus() == PaymentStatus.REFUNDED) {
                    log.info("Ignoring failed MoMo callback for closed order {}", orderId);
                    return;
                }
                // Thanh toán thất bại
                payment.setPaymentStatus(PaymentStatus.FAILED);
                payment.setFailureReason("MoMo resultCode: " + resultCode);
                order.setPaymentStatus(PaymentStatus.FAILED);
                releaseOrderReservation(order, "MoMo payment failed: " + resultCode);
            }

            paymentRepository.save(payment);
            orderRepository.save(order);

            log.info("MoMo callback processed for order {}: resultCode={}", orderId, resultCode);
        } catch (Exception e) {
            log.error("Error processing MoMo callback", e);
        }
    }

    // ==================== COD ====================

    @Override
    @Transactional
    public PaymentResponse confirmCodPayment(Long orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Thanh toán", "orderId", orderId));

        if (payment.getPaymentMethod() != PaymentMethod.COD) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Đơn hàng này không phải thanh toán COD");
        }

        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Đơn hàng này đã được xác nhận thanh toán");
        }

        if (payment.getPaymentStatus() != PaymentStatus.PENDING) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Trang thai thanh toan khong cho phep xac nhan COD");
        }

        payment.setPaymentStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());

        Order order = payment.getOrder();
        order.setPaymentStatus(PaymentStatus.PAID);

        paymentRepository.save(payment);
        orderRepository.save(order);

        return paymentMapper.toResponse(payment);
    }

    // ==================== READ ====================

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentByOrderId(Long orderId, String username) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Thanh toán", "orderId", orderId));

        // Kiểm tra quyền: chỉ chủ đơn hàng hoặc ADMIN/SALES_STAFF mới được xem
        Order order = payment.getOrder();
        if (!order.getCustomer().getUserName().equals(username)) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isStaff = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                            || a.getAuthority().equals("ROLE_SALES_STAFF"));
            if (!isStaff) {
                throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền xem thông tin thanh toán này");
            }
        }

        return paymentMapper.toResponse(payment);
    }

    // ==================== HELPER ====================

    private boolean isValidMomoSignature(Map<String, String> params) throws Exception {
        String providedSignature = params.get("signature");
        if (providedSignature == null || providedSignature.isBlank()) {
            return false;
        }

        List<String> keys = List.of(
                "accessKey",
                "amount",
                "extraData",
                "message",
                "orderId",
                "orderInfo",
                "orderType",
                "partnerCode",
                "payType",
                "requestId",
                "responseTime",
                "resultCode",
                "transId"
        );

        StringBuilder rawSignature = new StringBuilder();
        for (String key : keys) {
            if (rawSignature.length() > 0) {
                rawSignature.append('&');
            }
            String value = "accessKey".equals(key) ? momoConfig.getAccessKey() : params.getOrDefault(key, "");
            rawSignature.append(key).append('=').append(value);
        }

        String expectedSignature = hmacSHA256(momoConfig.getSecretKey(), rawSignature.toString());
        return expectedSignature.equalsIgnoreCase(providedSignature);
    }

    private void releaseOrderReservation(Order order, String reason) {
        if (order.getOrderStatus() == OrderStatus.CANCELLED
                || order.getOrderStatus() == OrderStatus.COMPLETED
                || order.getOrderStatus() == OrderStatus.DELIVERED) {
            return;
        }

        for (OrderItem item : order.getOrderItems()) {
            ProductVariant variant = item.getVariant();
            variant.setStockQuantity(variant.getStockQuantity() + item.getQuantity());
            variantRepository.save(variant);
        }

        if (order.getVoucher() != null) {
            voucherRepository.decrementUsedQuantity(order.getVoucher().getId());
            voucherUsedRepository.deleteByUserIdAndVoucherId(order.getCustomer().getId(), order.getVoucher().getId());
        }

        shipmentRepository.findByOrderId(order.getId()).ifPresent(shipment -> {
            shipment.setShipmentStatus(ShipmentStatus.FAILED);
            shipment.setFailureReason(reason);
            shipmentRepository.save(shipment);
        });

        order.setOrderStatus(OrderStatus.CANCELLED);
        order.setShippingStatus(ShipmentStatus.FAILED);
    }

    private String hmacSHA256(String key, String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKeySpec);
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1)
                hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
