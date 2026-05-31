package com.example.webtmdt.service.impl;

import com.example.webtmdt.dto.request.CreateOrderRequest;
import com.example.webtmdt.dto.request.OrderItemRequest;
import com.example.webtmdt.dto.request.UpdateOrderStatusRequest;
import com.example.webtmdt.dto.response.OrderItemResponse;
import com.example.webtmdt.dto.response.OrderResponse;
import com.example.webtmdt.entity.*;
import com.example.webtmdt.enums.*;
import com.example.webtmdt.exception.AppException;
import com.example.webtmdt.exception.ResourceNotFoundException;
import com.example.webtmdt.mapper.OrderMapper;
import com.example.webtmdt.repository.*;
import com.example.webtmdt.service.LoyaltyService;
import com.example.webtmdt.service.OrderService;
import com.example.webtmdt.service.PaymentService;
import com.example.webtmdt.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final AddressUserRepository addressRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductImageRepository imageRepository;
    private final VoucherRepository voucherRepository;
    private final VoucherUsedRepository voucherUsedRepository;
    private final PaymentRepository paymentRepository;
    private final ShipmentRepository shipmentRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final OrderMapper orderMapper;
    private final VoucherService voucherService;
    private final PaymentService paymentService;
    private final LoyaltyService loyaltyService;

    // ==================== CREATE ORDER ====================

    @Override
    @Transactional
    public OrderResponse createOrder(String username, CreateOrderRequest request) {
        User user = findUserOrThrow(username);

        // 1. Lấy địa chỉ giao hàng
        AddressUser address = addressRepository.findByIdAndUserId(request.getAddressId(), user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Địa chỉ", "id", request.getAddressId()));

        // 2. Tạo order
        Order order = Order.builder()
                .customer(user)
                .orderCode(generateOrderCode())
                .shippingName(address.getShipName())
                .shippingAddress(address.getShipAddress())
                .shippingPhone(address.getShipPhone())
                .orderStatus(OrderStatus.PENDING)
                .paymentStatus(PaymentStatus.PENDING)
                .shippingStatus(ShipmentStatus.PENDING)
                .shippingFee(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .subtotal(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .build();

        // 3. Xử lý từng item
        BigDecimal subtotal = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        for (OrderItemRequest itemReq : request.getItems()) {
            ProductVariant variant = variantRepository.findById(itemReq.getVariantId())
                    .orElseThrow(() -> new ResourceNotFoundException("Phân loại sản phẩm", "id", itemReq.getVariantId()));

            if (!Boolean.TRUE.equals(variant.getActive())) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Sản phẩm '" + variant.getProduct().getName() + "' đã ngừng kinh doanh");
            }

            // Trừ tồn kho
            int updated = variantRepository.decreaseStock(variant.getId(), itemReq.getQuantity());
            if (updated == 0) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Không đủ hàng trong kho cho '" + variant.getProduct().getName()
                                + "' (còn " + variant.getStockQuantity() + ")");
            }

            BigDecimal unitPrice = variant.getPriceOverride() != null
                    ? variant.getPriceOverride()
                    : variant.getProduct().getBasePrice();
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .variant(variant)
                    .productNameSnapshot(variant.getProduct().getName())
                    .colorSnapshot(variant.getColor())
                    .sizeSnapshot(variant.getSize())
                    .unitPrice(unitPrice)
                    .quantity(itemReq.getQuantity())
                    .lineTotal(lineTotal)
                    .build();

            orderItems.add(orderItem);
            subtotal = subtotal.add(lineTotal);
        }

        order.setSubtotal(subtotal);
        order.setOrderItems(orderItems);

        // 4. Áp dụng voucher (nếu có)
        BigDecimal discountAmount = BigDecimal.ZERO;
        if (request.getVoucherCode() != null && !request.getVoucherCode().isBlank()) {
            discountAmount = voucherService.calculateDiscount(request.getVoucherCode(), subtotal, user.getId());
            Voucher voucher = voucherRepository.findByCodeVoucher(request.getVoucherCode().toUpperCase())
                    .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Mã voucher không hợp lệ!"));
            order.setVoucher(voucher);
            order.setDiscountAmount(discountAmount);

            // Trừ số lượng voucher (chống Race Condition)
            int updatedVoucher = voucherRepository.incrementUsedQuantity(voucher.getId());
            if (updatedVoucher == 0) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Voucher đã hết lượt sử dụng ngay trước khi bạn đặt hàng!");
            }

            // Ghi nhận voucher đã dùng
            VoucherUsed voucherUsed = VoucherUsed.builder()
                    .user(user)
                    .voucher(voucher)
                    .status("USED")
                    .build();
            voucherUsedRepository.save(voucherUsed);
        }

        // 5. Tính tổng
        order.setTotalAmount(subtotal.subtract(discountAmount).add(order.getShippingFee()));

        // 6. Lưu order
        order = orderRepository.save(order);

        // 7. Tạo Payment record
        Payment payment = Payment.builder()
                .order(order)
                .paymentMethod(request.getPaymentMethod())
                .paymentStatus(PaymentStatus.PENDING)
                .amount(order.getTotalAmount())
                .build();
        paymentRepository.save(payment);

        // 8. Tạo Shipment record
        Shipment shipment = Shipment.builder()
                .order(order)
                .shipmentStatus(ShipmentStatus.PENDING)
                .build();
        shipmentRepository.save(shipment);

        // 9. Nếu MoMo → tạo payment link
        String momoPayUrl = null;
        if (request.getPaymentMethod() == PaymentMethod.MOMO) {
            momoPayUrl = paymentService.createMomoPayment(order);
        }

        // 10. Dọn dẹp giỏ hàng (Xóa những sản phẩm đã đặt khỏi giỏ)
        List<Long> orderedVariantIds = request.getItems().stream()
                .map(OrderItemRequest::getVariantId)
                .collect(Collectors.toList());
        cartRepository.findByCustomerId(user.getId()).ifPresent(cart -> {
            cartItemRepository.deleteByCartIdAndVariantIdIn(cart.getId(), orderedVariantIds);
        });

        OrderResponse response = toOrderResponse(order);
        response.setMomoPayUrl(momoPayUrl);
        return response;
    }

    // ==================== READ ====================

    @Override
    @Transactional(readOnly = true)
    public Page<OrderResponse> getMyOrders(String username, Pageable pageable) {
        User user = findUserOrThrow(username);
        return orderRepository.findByCustomerId(user.getId(), pageable)
                .map(this::toOrderResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(String username, Long orderId) {
        User user = findUserOrThrow(username);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng", "id", orderId));

        if (!order.getCustomer().getId().equals(user.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền xem đơn hàng này");
        }

        return toOrderResponse(order);
    }

    // ==================== CANCEL ====================

    @Override
    @Transactional
    public OrderResponse cancelOrder(String username, Long orderId, String reason) {
        User user = findUserOrThrow(username);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng", "id", orderId));

        if (!order.getCustomer().getId().equals(user.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền hủy đơn hàng này");
        }

        if (order.getOrderStatus() != OrderStatus.PENDING && order.getOrderStatus() != OrderStatus.CONFIRMED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chỉ có thể hủy đơn hàng ở trạng thái Chờ xác nhận hoặc Đã xác nhận");
        }

        // Hoàn stock
        cancelOrderInternal(order, reason == null || reason.isBlank() ? "Khach hang huy don" : reason);

        order = orderRepository.save(order);
        return toOrderResponse(order);
    }

    // ==================== COMPLETE ====================

    @Override
    @Transactional
    public OrderResponse completeOrder(String username, Long orderId) {
        User user = findUserOrThrow(username);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng", "id", orderId));

        if (!order.getCustomer().getId().equals(user.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền thực hiện trên đơn hàng này");
        }

        if (order.getOrderStatus() != OrderStatus.DELIVERED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chỉ có thể bấm Đã nhận được hàng khi đơn hàng ở trạng thái Đã giao (DELIVERED)");
        }

        completeOrderInternal(order);

        order = orderRepository.save(order);
        return toOrderResponse(order);
    }

    // ==================== ADMIN ====================

    @Override
    @Transactional(readOnly = true)
    public Page<OrderResponse> getAllOrders(OrderStatus status, Pageable pageable) {
        Page<Order> orders = status == null
                ? orderRepository.findAll(pageable)
                : orderRepository.findByOrderStatus(status, pageable);
        return orders.map(this::toOrderResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderByIdAdmin(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng", "id", orderId));
        return toOrderResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(String username, Long orderId, UpdateOrderStatusRequest request) {
        User actor = findUserOrThrow(username);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng", "id", orderId));

        OrderStatus newStatus = request.getOrderStatus();

        if (actor.getRole() == UserRole.SALES_STAFF) {
            return updateOrderStatusAsSales(order, newStatus, request.getCancelReason());
        }

        if (actor.getRole() != UserRole.ADMIN) {
            throw new AppException(HttpStatus.FORBIDDEN, "No permission to update this order");
        }

        applyAdminOrderStatus(order, newStatus, request.getCancelReason());
        order = orderRepository.save(order);
        return toOrderResponse(order);
    }

    // ==================== HELPER ====================

    private void applyAdminOrderStatus(Order order, OrderStatus newStatus, String cancelReason) {
        if (newStatus == order.getOrderStatus()) {
            return;
        }

        if (newStatus == OrderStatus.CONFIRMED) {
            confirmOrderInternal(order);
            return;
        }

        if (newStatus == OrderStatus.CANCELLED) {
            if (cancelReason == null || cancelReason.isBlank()) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Vui long cung cap ly do huy don");
            }
            if (order.getOrderStatus() != OrderStatus.PENDING && order.getOrderStatus() != OrderStatus.CONFIRMED) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Chi co the huy don o trang thai cho xac nhan hoac da xac nhan");
            }
            cancelOrderInternal(order, cancelReason);
            return;
        }

        if (newStatus == OrderStatus.COMPLETED) {
            completeOrderInternal(order);
            return;
        }

        throw new AppException(HttpStatus.BAD_REQUEST, "Trang thai nay phai duoc cap nhat tu man hinh giao hang");
    }

    private OrderResponse updateOrderStatusAsSales(Order order, OrderStatus newStatus, String cancelReason) {
        if (newStatus == OrderStatus.CONFIRMED) {
            confirmOrderInternal(order);
            return toOrderResponse(orderRepository.save(order));
        }

        if (newStatus == OrderStatus.CANCELLED) {
            if (order.getOrderStatus() != OrderStatus.PENDING && order.getOrderStatus() != OrderStatus.CONFIRMED) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Sales can only cancel pending or confirmed orders");
            }
            if (cancelReason == null || cancelReason.isBlank()) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Cancel reason is required");
            }
            cancelOrderInternal(order, cancelReason);
            return toOrderResponse(orderRepository.save(order));
        }

        throw new AppException(HttpStatus.FORBIDDEN, "Sales can only confirm or cancel orders");
    }

    private void confirmOrderInternal(Order order) {
        if (order.getOrderStatus() != OrderStatus.PENDING) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chi co the xac nhan don dang cho xac nhan");
        }
        ensurePaymentAllowsOrderConfirmation(order);
        order.setOrderStatus(OrderStatus.CONFIRMED);
    }

    private void completeOrderInternal(Order order) {
        if (order.getOrderStatus() != OrderStatus.DELIVERED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chi co the hoan thanh don da giao");
        }
        order.setOrderStatus(OrderStatus.COMPLETED);
        loyaltyService.earnPoints(order.getCustomer(), order);
    }

    private void cancelOrderInternal(Order order, String reason) {
        restoreStock(order);
        releaseVoucher(order);
        closePaymentForCancellation(order, reason);
        markShipmentFailed(order, "Order cancelled: " + reason);

        order.setOrderStatus(OrderStatus.CANCELLED);
        order.setCancelReason(reason);
        order.setShippingStatus(ShipmentStatus.FAILED);
    }

    private void ensurePaymentAllowsOrderConfirmation(Order order) {
        Payment payment = paymentRepository.findByOrderId(order.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Thanh toan", "orderId", order.getId()));

        if (payment.getPaymentMethod() == PaymentMethod.COD) {
            if (payment.getPaymentStatus() == PaymentStatus.CANCELLED || payment.getPaymentStatus() == PaymentStatus.FAILED) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Thanh toan COD cua don nay khong con hop le");
            }
            return;
        }

        if (payment.getPaymentStatus() != PaymentStatus.PAID) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Don thanh toan online phai thanh toan xong moi duoc xac nhan");
        }
    }

    private void closePaymentForCancellation(Order order, String reason) {
        paymentRepository.findByOrderId(order.getId()).ifPresent(payment -> {
            PaymentStatus closedStatus = payment.getPaymentStatus() == PaymentStatus.PAID
                    ? PaymentStatus.REFUNDED
                    : PaymentStatus.CANCELLED;
            payment.setPaymentStatus(closedStatus);
            payment.setFailureReason(reason);
            paymentRepository.save(payment);
            order.setPaymentStatus(closedStatus);
        });
    }

    private void releaseVoucher(Order order) {
        if (order.getVoucher() == null) {
            return;
        }

        voucherRepository.decrementUsedQuantity(order.getVoucher().getId());
        voucherUsedRepository.deleteByUserIdAndVoucherId(order.getCustomer().getId(), order.getVoucher().getId());
    }

    private void markShipmentFailed(Order order, String reason) {
        shipmentRepository.findByOrderId(order.getId()).ifPresent(shipment -> {
            shipment.setShipmentStatus(ShipmentStatus.FAILED);
            shipment.setFailureReason(reason);
            shipmentRepository.save(shipment);
        });
    }

    private void restoreStock(Order order) {
        for (OrderItem item : order.getOrderItems()) {
            ProductVariant variant = item.getVariant();
            variant.setStockQuantity(variant.getStockQuantity() + item.getQuantity());
            variantRepository.save(variant);
        }
    }

    private User findUserOrThrow(String username) {
        return userRepository.findByUserName(username)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "username", username));
    }

    private String generateOrderCode() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String random = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return "ORD" + timestamp + random;
    }

    private OrderResponse toOrderResponse(Order order) {
        OrderResponse response = orderMapper.toResponse(order);
        if (order.getShippingStatus() == ShipmentStatus.FAILED && order.getOrderStatus() == OrderStatus.SHIPPING) {
            response.setOrderStatus(OrderStatus.CONFIRMED.name());
        }

        // Map items với imageUrl
        List<OrderItemResponse> itemResponses = order.getOrderItems().stream()
                .map(item -> {
                    OrderItemResponse itemResponse = orderMapper.toItemResponse(item);
                    String imageUrl = imageRepository
                            .findByProductIdAndThumbnailTrue(item.getVariant().getProduct().getId())
                            .map(ProductImage::getImageUrl)
                            .orElse(null);
                    itemResponse.setImageUrl(imageUrl);
                    return itemResponse;
                })
                .collect(Collectors.toList());

        response.setItems(itemResponses);

        // Map paymentMethod từ bảng Payment
        paymentRepository.findByOrderId(order.getId()).ifPresent(payment ->
                response.setPaymentMethod(payment.getPaymentMethod().name())
        );

        return response;
    }
}
