package com.example.webtmdt.repository;

import com.example.webtmdt.entity.Order;
import com.example.webtmdt.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Page<Order> findByCustomerId(Long customerId, Pageable pageable);

    Optional<Order> findByOrderCode(String orderCode);

    Page<Order> findByCustomerIdAndOrderStatus(Long customerId, OrderStatus orderStatus, Pageable pageable);

    Page<Order> findByOrderStatus(OrderStatus orderStatus, Pageable pageable);

    long countByOrderStatus(OrderStatus orderStatus);

    @Query(value = "SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE order_status IN (:statuses)", nativeQuery = true)
    BigDecimal sumTotalAmountByOrderStatusIn(@Param("statuses") Collection<String> statuses);

    boolean existsByOrderCode(String orderCode);
}
