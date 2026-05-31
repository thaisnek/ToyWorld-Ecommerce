package com.example.webtmdt.enums;

public enum ShipmentStatus {
    PENDING,    // Chờ phân công
    ASSIGNED,   // Đã phân công shipper
    SHIPPING,   // Đang giao hàng
    DELIVERED,  // Đã giao thành công
    FAILED      // Giao thất bại
}
