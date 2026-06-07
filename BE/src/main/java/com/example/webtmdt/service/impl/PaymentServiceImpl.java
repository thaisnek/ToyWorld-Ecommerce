package com.example.webtmdt.service.impl;

import com.example.webtmdt.configuration.MomoConfig;
import com.example.webtmdt.configuration.VnpayConfig;
import com.example.webtmdt.dto.response.PaymentResponse;
import com.example.webtmdt.entity.Order;
import com.example.webtmdt.entity.OrderItem;
import com.example.webtmdt.entity.Payment;
import com.example.webtmdt.entity.ProductVariant;
import com.example.webtmdt.enums.OrderStatus;
import com.example.webtmdt.enums.PaymentMethod;
import com.example.webtmdt.enums.PaymentStatus;
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
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private static final ZoneId VNPAY_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNPAY_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final String SUCCESS_CODE = "00";
    private static final String DEFAULT_FRONTEND_RESULT_URL = "http://127.0.0.1:5173/payment/result";

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final ProductVariantRepository variantRepository;
    private final ShipmentRepository shipmentRepository;
    private final VoucherRepository voucherRepository;
    private final VoucherUsedRepository voucherUsedRepository;
    private final PaymentMapper paymentMapper;
    private final MomoConfig momoConfig;
    private final VnpayConfig vnpayConfig;
    private final ObjectMapper objectMapper;

    // ==================== MOMO PAYMENT ====================

    @Override
    public String createMomoPayment(Order order) {
        try {
            String requestId = UUID.randomUUID().toString();
            String orderId = order.getOrderCode();
            String amount = order.getTotalAmount().toBigInteger().toString();
            String orderInfo = "Thanh toan don hang " + order.getOrderCode();
            String requestType = "payWithMethod";
            String extraData = "";

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
            }

            String message = responseNode.has("message")
                    ? responseNode.get("message").asText()
                    : "MoMo resultCode: " + resultCode;
            log.warn("MoMo create payment failed for order {}: {}", orderId, message);
            throw new AppException(HttpStatus.BAD_REQUEST, "Khong tao duoc thanh toan MoMo: " + message);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("MoMo payment exception", e);
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Loi ket noi cong thanh toan MoMo");
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
                    .orElseThrow(() -> new ResourceNotFoundException("Don hang", "orderCode", orderId));

            Payment payment = paymentRepository.findByOrderId(order.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Thanh toan", "orderId", order.getId()));

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

    // ==================== VNPAY PAYMENT ====================

    @Override
    public String createVnpayPayment(Order order, String clientIp) {
        validateVnpayConfig();

        ZonedDateTime now = ZonedDateTime.now(VNPAY_ZONE);
        String amount = order.getTotalAmount()
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .toPlainString();

        Map<String, String> params = new HashMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", cleanConfigValue(vnpayConfig.getTmnCode()));
        params.put("vnp_Amount", amount);
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", createVnpayTxnRef(order));
        params.put("vnp_OrderInfo", "Thanh toan don hang " + order.getOrderCode());
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", cleanConfigValue(vnpayConfig.getReturnUrl()));
        params.put("vnp_IpAddr", normalizeClientIp(clientIp));
        params.put("vnp_CreateDate", now.format(VNPAY_DATE_FORMATTER));
        params.put("vnp_ExpireDate", now.plusMinutes(15).format(VNPAY_DATE_FORMATTER));

        try {
            String hashData = buildVnpayHashData(params);
            String queryData = buildVnpayQueryData(params);
            String secureHash = hmacSHA512(cleanConfigValue(vnpayConfig.getHashSecret()), hashData);
            return cleanConfigValue(vnpayConfig.getPayUrl()) + "?" + queryData + "&vnp_SecureHash=" + secureHash;
        } catch (Exception e) {
            log.error("VNPay create payment exception", e);
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Khong tao duoc thanh toan VNPay");
        }
    }

    @Override
    @Transactional
    public String handleVnpayReturn(Map<String, String> params) {
        VnpayProcessResult result = processVnpayParams(params);
        return buildFrontendResultUrl(result);
    }

    @Override
    @Transactional
    public Map<String, String> handleVnpayIpn(Map<String, String> params) {
        VnpayProcessResult result = processVnpayParams(params);
        return Map.of("RspCode", result.ipnCode(), "Message", result.ipnMessage());
    }

    private VnpayProcessResult processVnpayParams(Map<String, String> params) {
        if (params == null || params.isEmpty()) {
            return VnpayProcessResult.error("99", "Input data required", "", "99", "Input data required");
        }

        if (!isValidVnpaySignature(params)) {
            log.warn("Rejected VNPay callback with invalid signature for vnp_TxnRef={}", params.get("vnp_TxnRef"));
            return VnpayProcessResult.error("97", "Chu ky VNPay khong hop le", params.get("vnp_TxnRef"), "97", "Invalid signature");
        }

        String orderCode = extractOrderCodeFromVnpayTxnRef(params.get("vnp_TxnRef"));
        String responseCode = params.getOrDefault("vnp_ResponseCode", "");
        String transactionStatus = params.getOrDefault("vnp_TransactionStatus", "");
        String transactionNo = params.get("vnp_TransactionNo");

        try {
            Order order = orderRepository.findByOrderCode(orderCode)
                    .orElseThrow(() -> new ResourceNotFoundException("Don hang", "orderCode", orderCode));
            Payment payment = paymentRepository.findByOrderId(order.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Thanh toan", "orderId", order.getId()));

            BigDecimal callbackAmount = parseVnpayAmount(params.get("vnp_Amount"));
            if (callbackAmount.compareTo(order.getTotalAmount()) != 0) {
                log.warn("Rejected VNPay callback for order {} because amount {} != {}", orderCode, callbackAmount, order.getTotalAmount());
                return VnpayProcessResult.error("04", "So tien VNPay khong khop voi don hang", orderCode, "04", "invalid amount");
            }

            boolean paid = SUCCESS_CODE.equals(responseCode)
                    && (transactionStatus == null || transactionStatus.isBlank() || SUCCESS_CODE.equals(transactionStatus));

            if (payment.getPaymentStatus() == PaymentStatus.PAID) {
                return VnpayProcessResult.success(orderCode, "Don hang da duoc thanh toan truoc do", "02", "Order already confirmed");
            }

            if (payment.getPaymentStatus() == PaymentStatus.CANCELLED || payment.getPaymentStatus() == PaymentStatus.REFUNDED) {
                return VnpayProcessResult.error("02", "Don hang da dong, khong cap nhat thanh toan", orderCode, "02", "Order already confirmed");
            }

            if (paid) {
                payment.setPaymentStatus(PaymentStatus.PAID);
                payment.setPaidAt(parseVnpayPayDate(params.get("vnp_PayDate")));
                payment.setProviderTransactionId(transactionNo);
                payment.setProviderName("VNPAY");
                payment.setFailureReason(null);
                order.setPaymentStatus(PaymentStatus.PAID);

                paymentRepository.save(payment);
                orderRepository.save(order);

                log.info("VNPay payment succeeded for order {}", orderCode);
                return VnpayProcessResult.success(orderCode, "Thanh toan VNPay thanh cong", "00", "Confirm Success");
            }

            if (payment.getPaymentStatus() == PaymentStatus.FAILED) {
                return VnpayProcessResult.error(responseCode, "Thanh toan VNPay da that bai truoc do", orderCode, "02", "Order already confirmed");
            }

            payment.setPaymentStatus(PaymentStatus.FAILED);
            payment.setFailureReason("VNPay responseCode: " + responseCode + ", transactionStatus: " + transactionStatus);
            payment.setProviderTransactionId(transactionNo);
            payment.setProviderName("VNPAY");
            order.setPaymentStatus(PaymentStatus.FAILED);
            releaseOrderReservation(order, "VNPay payment failed: " + responseCode);

            paymentRepository.save(payment);
            orderRepository.save(order);

            log.info("VNPay payment failed for order {}: responseCode={}, transactionStatus={}", orderCode, responseCode, transactionStatus);
            return VnpayProcessResult.error(responseCode, "Thanh toan VNPay khong thanh cong", orderCode, "00", "Confirm Success");
        } catch (ResourceNotFoundException e) {
            log.warn("VNPay callback order not found: {}", orderCode);
            return VnpayProcessResult.error("01", "Khong tim thay don hang", orderCode, "01", "Order not found");
        } catch (Exception e) {
            log.error("Error processing VNPay callback", e);
            return VnpayProcessResult.error("99", "Loi xu ly VNPay", orderCode, "99", "Unknown error");
        }
    }

    @Override
    @Transactional
    public PaymentResponse retryOnlinePayment(Long orderId, String username, String clientIp) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Thanh toan", "orderId", orderId));

        Order order = payment.getOrder();
        if (!order.getCustomer().getUserName().equals(username)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen thanh toan don hang nay");
        }

        if (payment.getPaymentMethod() == PaymentMethod.COD) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Don COD khong can thanh toan online");
        }

        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Don hang nay da thanh toan");
        }

        if (payment.getPaymentStatus() == PaymentStatus.CANCELLED || payment.getPaymentStatus() == PaymentStatus.REFUNDED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Thanh toan cua don hang nay da dong");
        }

        if (order.getOrderStatus() == OrderStatus.CANCELLED
                || order.getOrderStatus() == OrderStatus.COMPLETED
                || order.getOrderStatus() == OrderStatus.DELIVERED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Trang thai don hang khong cho phep thanh toan lai");
        }

        payment.setPaymentStatus(PaymentStatus.PENDING);
        payment.setFailureReason(null);
        order.setPaymentStatus(PaymentStatus.PENDING);
        paymentRepository.save(payment);
        orderRepository.save(order);

        String paymentUrl;
        if (payment.getPaymentMethod() == PaymentMethod.VNPAY) {
            paymentUrl = createVnpayPayment(order, clientIp);
        } else if (payment.getPaymentMethod() == PaymentMethod.MOMO) {
            paymentUrl = createMomoPayment(order);
        } else {
            throw new AppException(HttpStatus.BAD_REQUEST, "Phuong thuc thanh toan online khong ho tro");
        }

        PaymentResponse response = paymentMapper.toResponse(payment);
        response.setPaymentUrl(paymentUrl);
        response.setMomoPayUrl(paymentUrl);
        return response;
    }

    // ==================== COD ====================

    @Override
    @Transactional
    public PaymentResponse confirmCodPayment(Long orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Thanh toan", "orderId", orderId));

        if (payment.getPaymentMethod() != PaymentMethod.COD) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Don hang nay khong phai thanh toan COD");
        }

        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Don hang nay da duoc xac nhan thanh toan");
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
                .orElseThrow(() -> new ResourceNotFoundException("Thanh toan", "orderId", orderId));

        Order order = payment.getOrder();
        if (!order.getCustomer().getUserName().equals(username)) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isStaff = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                            || a.getAuthority().equals("ROLE_SALES_STAFF"));
            if (!isStaff) {
                throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem thong tin thanh toan nay");
            }
        }

        return paymentMapper.toResponse(payment);
    }

    // ==================== HELPER ====================

    private void validateVnpayConfig() {
        String tmnCode = cleanConfigValue(vnpayConfig.getTmnCode());
        String hashSecret = cleanConfigValue(vnpayConfig.getHashSecret());
        String payUrl = cleanConfigValue(vnpayConfig.getPayUrl());
        String returnUrl = cleanConfigValue(vnpayConfig.getReturnUrl());

        if (isBlank(tmnCode)
                || isPlaceholder(tmnCode)
                || isBlank(hashSecret)
                || isPlaceholder(hashSecret)
                || isBlank(payUrl)
                || isBlank(returnUrl)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chua cau hinh VNPay: vnpay.tmn-code, vnpay.hash-secret, vnpay.pay-url, vnpay.return-url");
        }
    }

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

    private boolean isValidVnpaySignature(Map<String, String> params) {
        try {
            String providedHash = params.get("vnp_SecureHash");
            if (isBlank(providedHash) || isBlank(vnpayConfig.getHashSecret())) {
                return false;
            }

            Map<String, String> unsignedParams = new TreeMap<>();
            params.forEach((key, value) -> {
                if (key != null
                        && key.startsWith("vnp_")
                        && !"vnp_SecureHash".equals(key)
                        && !"vnp_SecureHashType".equals(key)
                        && !isBlank(value)) {
                    unsignedParams.put(key, value);
                }
            });

            String expectedHash = hmacSHA512(cleanConfigValue(vnpayConfig.getHashSecret()), buildVnpayHashData(unsignedParams));
            return expectedHash.equalsIgnoreCase(providedHash);
        } catch (Exception e) {
            log.error("VNPay signature validation failed", e);
            return false;
        }
    }

    private String buildVnpayHashData(Map<String, String> params) {
        return params.entrySet().stream()
                .filter(entry -> !isBlank(entry.getValue()))
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> entry.getKey() + "=" + urlEncodeAscii(entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    private String buildVnpayQueryData(Map<String, String> params) {
        return params.entrySet().stream()
                .filter(entry -> !isBlank(entry.getValue()))
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> urlEncodeAscii(entry.getKey()) + "=" + urlEncodeAscii(entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    private BigDecimal parseVnpayAmount(String amount) {
        return new BigDecimal(amount).divide(BigDecimal.valueOf(100), 0, RoundingMode.UNNECESSARY);
    }

    private LocalDateTime parseVnpayPayDate(String payDate) {
        if (isBlank(payDate)) {
            return LocalDateTime.now();
        }

        try {
            return LocalDateTime.parse(payDate, VNPAY_DATE_FORMATTER);
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }

    private String buildFrontendResultUrl(VnpayProcessResult result) {
        String baseUrl = isBlank(vnpayConfig.getFrontendResultUrl())
                ? DEFAULT_FRONTEND_RESULT_URL
                : cleanConfigValue(vnpayConfig.getFrontendResultUrl());
        String separator = baseUrl.contains("?") ? "&" : "?";

        return baseUrl
                + separator
                + "gateway=VNPAY"
                + "&resultCode=" + urlEncodeUtf8(result.resultCode())
                + "&message=" + urlEncodeUtf8(result.message())
                + "&orderId=" + urlEncodeUtf8(result.orderCode());
    }

    private String normalizeClientIp(String clientIp) {
        if (isBlank(clientIp) || "0:0:0:0:0:0:0:1".equals(clientIp) || "::1".equals(clientIp)) {
            return "127.0.0.1";
        }
        return clientIp;
    }

    private String createVnpayTxnRef(Order order) {
        return order.getOrderCode() + "R" + System.currentTimeMillis();
    }

    private String extractOrderCodeFromVnpayTxnRef(String txnRef) {
        if (isBlank(txnRef)) {
            return "";
        }

        int retryMarkerIndex = txnRef.lastIndexOf('R');
        if (retryMarkerIndex > 0 && retryMarkerIndex < txnRef.length() - 1) {
            String suffix = txnRef.substring(retryMarkerIndex + 1);
            if (suffix.chars().allMatch(Character::isDigit)) {
                return txnRef.substring(0, retryMarkerIndex);
            }
        }

        return txnRef;
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
        return hmac("HmacSHA256", key, data);
    }

    private String hmacSHA512(String key, String data) throws Exception {
        return hmac("HmacSHA512", key, data);
    }

    private String hmac(String algorithm, String key, String data) throws Exception {
        Mac mac = Mac.getInstance(algorithm);
        SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), algorithm);
        mac.init(secretKeySpec);
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }

    private String urlEncodeAscii(String value) {
        return URLEncoder.encode(value, StandardCharsets.US_ASCII);
    }

    private String urlEncodeUtf8(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String cleanConfigValue(String value) {
        return value == null ? null : value.trim();
    }

    private boolean isPlaceholder(String value) {
        return value != null && value.startsWith("YOUR_");
    }

    private record VnpayProcessResult(
            String resultCode,
            String message,
            String orderCode,
            String ipnCode,
            String ipnMessage
    ) {
        private static VnpayProcessResult success(String orderCode, String message, String ipnCode, String ipnMessage) {
            return new VnpayProcessResult("0", message, orderCode == null ? "" : orderCode, ipnCode, ipnMessage);
        }

        private static VnpayProcessResult error(String resultCode, String message, String orderCode, String ipnCode, String ipnMessage) {
            return new VnpayProcessResult(resultCode == null || resultCode.isBlank() ? "99" : resultCode,
                    message,
                    orderCode == null ? "" : orderCode,
                    ipnCode,
                    ipnMessage);
        }
    }
}
