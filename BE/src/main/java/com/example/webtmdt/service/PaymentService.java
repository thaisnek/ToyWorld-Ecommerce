package com.example.webtmdt.service;

import com.example.webtmdt.dto.response.PaymentResponse;
import com.example.webtmdt.entity.Order;

public interface PaymentService {

    /** Tạo MoMo payment link, trả về payUrl */
    String createMomoPayment(Order order);

    /** Xử lý MoMo IPN callback */
    void handleMomoCallback(java.util.Map<String, String> params);

    /** Admin xác nhận COD đã nhận tiền */
    PaymentResponse confirmCodPayment(Long orderId);

    /** Lấy thông tin payment theo orderId (kiểm tra quyền truy cập) */
    PaymentResponse getPaymentByOrderId(Long orderId, String username);
}
