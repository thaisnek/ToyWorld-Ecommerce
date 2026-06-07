package com.example.webtmdt.service;

import com.example.webtmdt.dto.request.CreateOrderRequest;
import com.example.webtmdt.dto.request.UpdateOrderStatusRequest;
import com.example.webtmdt.dto.response.OrderResponse;
import com.example.webtmdt.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface OrderService {

    // ===== Customer =====
    OrderResponse createOrder(String username, CreateOrderRequest request, String clientIp);

    Page<OrderResponse> getMyOrders(String username, Pageable pageable);

    OrderResponse getOrderById(String username, Long orderId);

    OrderResponse cancelOrder(String username, Long orderId, String reason);

    OrderResponse completeOrder(String username, Long orderId);

    // ===== Admin =====
    Page<OrderResponse> getAllOrders(OrderStatus status, Pageable pageable);

    OrderResponse getOrderByIdAdmin(Long orderId);

    OrderResponse updateOrderStatus(String username, Long orderId, UpdateOrderStatusRequest request);
}
