package com.example.webtmdt.service;

import com.example.webtmdt.dto.response.PaymentResponse;
import com.example.webtmdt.entity.Order;

import java.util.Map;

public interface PaymentService {

    String createMomoPayment(Order order);

    void handleMomoCallback(Map<String, String> params);

    String createVnpayPayment(Order order, String clientIp);

    String handleVnpayReturn(Map<String, String> params);

    Map<String, String> handleVnpayIpn(Map<String, String> params);

    PaymentResponse retryOnlinePayment(Long orderId, String username, String clientIp);

    PaymentResponse confirmCodPayment(Long orderId);

    PaymentResponse getPaymentByOrderId(Long orderId, String username);
}
