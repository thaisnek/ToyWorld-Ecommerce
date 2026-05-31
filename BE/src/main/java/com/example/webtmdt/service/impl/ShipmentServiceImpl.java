package com.example.webtmdt.service.impl;

import com.example.webtmdt.dto.request.AssignShipmentRequest;
import com.example.webtmdt.dto.request.UpdateShipmentStatusRequest;
import com.example.webtmdt.dto.response.OrderItemResponse;
import com.example.webtmdt.dto.response.ShipmentResponse;
import com.example.webtmdt.entity.Order;
import com.example.webtmdt.entity.Payment;
import com.example.webtmdt.entity.ProductImage;
import com.example.webtmdt.entity.Shipment;
import com.example.webtmdt.entity.User;
import com.example.webtmdt.enums.OrderStatus;
import com.example.webtmdt.enums.PaymentStatus;
import com.example.webtmdt.enums.ShipmentStatus;
import com.example.webtmdt.enums.UserRole;
import com.example.webtmdt.enums.UserStatus;
import com.example.webtmdt.exception.AppException;
import com.example.webtmdt.exception.ResourceNotFoundException;
import com.example.webtmdt.mapper.OrderMapper;
import com.example.webtmdt.mapper.ShipmentMapper;
import com.example.webtmdt.repository.OrderRepository;
import com.example.webtmdt.repository.PaymentRepository;
import com.example.webtmdt.repository.ProductImageRepository;
import com.example.webtmdt.repository.ShipmentRepository;
import com.example.webtmdt.repository.UserRepository;
import com.example.webtmdt.service.LoyaltyService;
import com.example.webtmdt.service.PaymentService;
import com.example.webtmdt.service.ShipmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShipmentServiceImpl implements ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final ProductImageRepository imageRepository;
    private final ShipmentMapper shipmentMapper;
    private final OrderMapper orderMapper;
    private final PaymentService paymentService;
    private final LoyaltyService loyaltyService;

    @Override
    @Transactional
    public ShipmentResponse assignDeliveryStaff(Long orderId, AssignShipmentRequest request) {
        Shipment shipment = shipmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "orderId", orderId));

        User staff = userRepository.findById(request.getDeliveryStaffId())
                .orElseThrow(() -> new ResourceNotFoundException("Delivery staff", "id", request.getDeliveryStaffId()));

        if (staff.getRole() != UserRole.DELIVERY_STAFF || staff.getStatus() != UserStatus.ACTIVE) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Selected user must be an active delivery staff");
        }

        Order order = shipment.getOrder();
        boolean canAssignConfirmedOrder = order.getOrderStatus() == OrderStatus.CONFIRMED;
        boolean canReassignFailedDelivery = order.getOrderStatus() == OrderStatus.SHIPPING
                && shipment.getShipmentStatus() == ShipmentStatus.FAILED;

        if (!canAssignConfirmedOrder && !canReassignFailedDelivery) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Only confirmed orders can be assigned to delivery staff");
        }

        if (shipment.getShipmentStatus() == ShipmentStatus.DELIVERED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Delivered shipments cannot be reassigned");
        }

        ensurePaymentAllowsShipment(order);

        shipment.setDeliveryStaff(staff);
        shipment.setShipmentStatus(ShipmentStatus.ASSIGNED);
        shipment.setAssignedAt(LocalDateTime.now());
        shipment.setShippedAt(null);
        shipment.setDeliveredAt(null);
        shipment.setFailureReason(null);

        order.setOrderStatus(OrderStatus.CONFIRMED);
        order.setShippingStatus(ShipmentStatus.ASSIGNED);
        orderRepository.save(order);

        return toShipmentResponse(shipmentRepository.save(shipment));
    }

    @Override
    @Transactional
    public ShipmentResponse updateShipmentStatus(String username, Long shipmentId, UpdateShipmentStatusRequest request) {
        User actor = findUserOrThrow(username);
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "id", shipmentId));

        if (actor.getRole() == UserRole.DELIVERY_STAFF) {
            assertAssignedToActor(shipment, actor);
        } else if (actor.getRole() != UserRole.ADMIN) {
            throw new AppException(HttpStatus.FORBIDDEN, "No permission to update this shipment");
        }

        ShipmentStatus newStatus = request.getStatus();
        validateTransition(shipment.getShipmentStatus(), newStatus, request.getFailureReason());
        if (shipment.getShipmentStatus() == newStatus) {
            return toShipmentResponse(shipment);
        }

        Order order = shipment.getOrder();
        switch (newStatus) {
            case SHIPPING:
                ensurePaymentAllowsShipment(order);
                shipment.setShippedAt(LocalDateTime.now());
                order.setOrderStatus(OrderStatus.SHIPPING);
                break;
            case DELIVERED:
                ensurePaymentAllowsShipment(order);
                shipment.setDeliveredAt(LocalDateTime.now());
                order.setOrderStatus(OrderStatus.DELIVERED);
                confirmCodPaymentIfNeeded(order);
                break;
            case FAILED:
                shipment.setFailureReason(request.getFailureReason().trim());
                order.setOrderStatus(OrderStatus.CONFIRMED);
                break;
            default:
                throw new AppException(HttpStatus.BAD_REQUEST, "Unsupported shipment status update");
        }

        shipment.setShipmentStatus(newStatus);
        order.setShippingStatus(newStatus);

        orderRepository.save(order);
        return toShipmentResponse(shipmentRepository.save(shipment));
    }

    @Override
    @Transactional(readOnly = true)
    public ShipmentResponse getShipmentByOrderId(String username, Long orderId) {
        User actor = findUserOrThrow(username);
        Shipment shipment = shipmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "orderId", orderId));

        if (actor.getRole() == UserRole.DELIVERY_STAFF) {
            assertAssignedToActor(shipment, actor);
        } else if (actor.getRole() != UserRole.ADMIN && actor.getRole() != UserRole.SALES_STAFF) {
            throw new AppException(HttpStatus.FORBIDDEN, "No permission to view this shipment");
        }

        return toShipmentResponse(shipment);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ShipmentResponse> getAllShipments(ShipmentStatus status, Long deliveryStaffId, Pageable pageable) {
        Page<Shipment> shipments;
        if (deliveryStaffId != null && status != null) {
            shipments = shipmentRepository.findByDeliveryStaffIdAndShipmentStatus(deliveryStaffId, status, pageable);
        } else if (deliveryStaffId != null) {
            shipments = shipmentRepository.findByDeliveryStaffId(deliveryStaffId, pageable);
        } else if (status != null) {
            shipments = shipmentRepository.findByShipmentStatus(status, pageable);
        } else {
            shipments = shipmentRepository.findAll(pageable);
        }

        return shipments.map(this::toShipmentResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ShipmentResponse> getMyAssignedShipments(String username, ShipmentStatus status, Pageable pageable) {
        User user = findUserOrThrow(username);
        Page<Shipment> shipments = status == null
                ? shipmentRepository.findByDeliveryStaffId(user.getId(), pageable)
                : shipmentRepository.findByDeliveryStaffIdAndShipmentStatus(user.getId(), status, pageable);
        return shipments.map(this::toShipmentResponse);
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void autoCompleteDeliveredOrders() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(2);
        List<Shipment> shipments = shipmentRepository.findByShipmentStatusAndDeliveredAtBeforeAndOrderOrderStatus(
                ShipmentStatus.DELIVERED,
                cutoff,
                OrderStatus.DELIVERED);

        for (Shipment shipment : shipments) {
            Order order = shipment.getOrder();
            order.setOrderStatus(OrderStatus.COMPLETED);
            loyaltyService.earnPoints(order.getCustomer(), order);
            orderRepository.save(order);
        }
    }

    private void assertAssignedToActor(Shipment shipment, User actor) {
        if (shipment.getDeliveryStaff() == null || !shipment.getDeliveryStaff().getId().equals(actor.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Delivery staff can only access assigned shipments");
        }
    }

    private void ensurePaymentAllowsShipment(Order order) {
        Payment payment = paymentRepository.findByOrderId(order.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment", "orderId", order.getId()));

        if (payment.getPaymentMethod() == com.example.webtmdt.enums.PaymentMethod.COD) {
            if (payment.getPaymentStatus() == PaymentStatus.CANCELLED
                    || payment.getPaymentStatus() == PaymentStatus.FAILED
                    || payment.getPaymentStatus() == PaymentStatus.REFUNDED) {
                throw new AppException(HttpStatus.BAD_REQUEST, "COD payment state does not allow shipping");
            }
            return;
        }

        if (payment.getPaymentStatus() != PaymentStatus.PAID) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Online payment must be paid before shipping");
        }
    }

    private void validateTransition(ShipmentStatus currentStatus, ShipmentStatus newStatus, String failureReason) {
        if (currentStatus == newStatus) {
            return;
        }

        if (newStatus == ShipmentStatus.SHIPPING && currentStatus == ShipmentStatus.ASSIGNED) {
            return;
        }

        if (newStatus == ShipmentStatus.DELIVERED && currentStatus == ShipmentStatus.SHIPPING) {
            return;
        }

        if (newStatus == ShipmentStatus.FAILED
                && (currentStatus == ShipmentStatus.ASSIGNED || currentStatus == ShipmentStatus.SHIPPING)) {
            if (failureReason == null || failureReason.isBlank()) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Failure reason is required");
            }
            return;
        }

        throw new AppException(HttpStatus.BAD_REQUEST, "Invalid shipment status transition");
    }

    private void confirmCodPaymentIfNeeded(Order order) {
        if (order.getPaymentStatus() != PaymentStatus.PENDING) {
            return;
        }

        try {
            paymentService.confirmCodPayment(order.getId());
        } catch (Exception ignored) {
            // Non-COD payments are settled by their payment provider.
        }
    }

    private ShipmentResponse toShipmentResponse(Shipment shipment) {
        ShipmentResponse response = shipmentMapper.toResponse(shipment);
        Order order = shipment.getOrder();
        if (shipment.getShipmentStatus() == ShipmentStatus.FAILED && order.getOrderStatus() == OrderStatus.SHIPPING) {
            response.setOrderStatus(OrderStatus.CONFIRMED.name());
        }
        List<OrderItemResponse> items = order.getOrderItems().stream()
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
        response.setItems(items);
        return response;
    }

    private User findUserOrThrow(String username) {
        return userRepository.findByUserName(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
    }
}
