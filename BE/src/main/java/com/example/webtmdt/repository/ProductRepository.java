package com.example.webtmdt.repository;

import com.example.webtmdt.entity.Product;
import com.example.webtmdt.dto.response.ProductSalesStatResponse;
import com.example.webtmdt.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findByStatus(String status, Pageable pageable);

    long countByStatus(String status);

    Page<Product> findByCategoryIdIn(Collection<Long> categoryIds, Pageable pageable);

    Page<Product> findByStatusAndBasePriceBetween(String status, BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable);

    Page<Product> findBySupplierIdAndStatus(Long supplierId, String status, Pageable pageable);

    Page<Product> findBySupplierId(Long supplierId, Pageable pageable);

    boolean existsByName(String name);

    @Query("""
            SELECT p FROM Product p
            WHERE (:status IS NULL OR p.status = :status)
              AND (:filterByCategory = false OR p.category.id IN :categoryIds)
              AND (
                :keyword IS NULL OR :keyword = '' OR
                LOWER(COALESCE(p.name, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                LOWER(COALESCE(p.brand, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            """)
    Page<Product> findCatalogProducts(
            @Param("status") String status,
            @Param("filterByCategory") boolean filterByCategory,
            @Param("categoryIds") Collection<Long> categoryIds,
            @Param("keyword") String keyword,
            Pageable pageable);

    /**
     * Tìm kiếm sản phẩm theo keyword (tên hoặc mô tả)
     */
    @Query("SELECT p FROM Product p WHERE " +
            "LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Product> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Lọc sản phẩm theo khoảng giá
     */
    @Query("SELECT p FROM Product p WHERE p.basePrice BETWEEN :minPrice AND :maxPrice")
    Page<Product> findByPriceBetween(
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            Pageable pageable);

    @Query("""
            SELECT new com.example.webtmdt.dto.response.ProductSalesStatResponse(
                p.id,
                p.name,
                c.name,
                COALESCE(SUM(CASE
                    WHEN o.orderStatus IN :soldStatuses
                     AND (:fromDate IS NULL OR o.createdAt >= :fromDate)
                     AND (:toDate IS NULL OR o.createdAt < :toDate)
                    THEN oi.quantity ELSE 0
                END), 0)
            )
            FROM Product p
            LEFT JOIN p.category c
            LEFT JOIN p.variants v
            LEFT JOIN v.orderItems oi
            LEFT JOIN oi.order o
            WHERE p.status = :status
            GROUP BY p.id, p.name, c.name
            ORDER BY COALESCE(SUM(CASE
                WHEN o.orderStatus IN :soldStatuses
                 AND (:fromDate IS NULL OR o.createdAt >= :fromDate)
                 AND (:toDate IS NULL OR o.createdAt < :toDate)
                THEN oi.quantity ELSE 0
            END), 0) DESC, p.id ASC
            """)
    List<ProductSalesStatResponse> findTopSellingProducts(
            @Param("status") String status,
            @Param("soldStatuses") Collection<OrderStatus> soldStatuses,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable);

    @Query("""
            SELECT new com.example.webtmdt.dto.response.ProductSalesStatResponse(
                p.id,
                p.name,
                c.name,
                COALESCE(SUM(CASE
                    WHEN o.orderStatus IN :soldStatuses
                     AND (:fromDate IS NULL OR o.createdAt >= :fromDate)
                     AND (:toDate IS NULL OR o.createdAt < :toDate)
                    THEN oi.quantity ELSE 0
                END), 0)
            )
            FROM Product p
            LEFT JOIN p.category c
            LEFT JOIN p.variants v
            LEFT JOIN v.orderItems oi
            LEFT JOIN oi.order o
            WHERE p.status = :status
            GROUP BY p.id, p.name, c.name
            ORDER BY COALESCE(SUM(CASE
                WHEN o.orderStatus IN :soldStatuses
                 AND (:fromDate IS NULL OR o.createdAt >= :fromDate)
                 AND (:toDate IS NULL OR o.createdAt < :toDate)
                THEN oi.quantity ELSE 0
            END), 0) ASC, p.id ASC
            """)
    List<ProductSalesStatResponse> findLowSellingProducts(
            @Param("status") String status,
            @Param("soldStatuses") Collection<OrderStatus> soldStatuses,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable);
}
