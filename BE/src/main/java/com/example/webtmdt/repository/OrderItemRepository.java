package com.example.webtmdt.repository;

import com.example.webtmdt.entity.OrderItem;
import com.example.webtmdt.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByOrderId(Long orderId);

    @Query("""
            SELECT oi.variant.product.id AS productId,
                   COALESCE(SUM(oi.quantity), 0) AS sold
            FROM OrderItem oi
            WHERE oi.variant.product.id IN :productIds
              AND oi.order.orderStatus IN :soldStatuses
            GROUP BY oi.variant.product.id
            """)
    List<ProductSoldProjection> sumSoldByProductIds(
            @Param("productIds") Collection<Long> productIds,
            @Param("soldStatuses") Collection<OrderStatus> soldStatuses);

    interface ProductSoldProjection {
        Long getProductId();
        Long getSold();
    }
}
