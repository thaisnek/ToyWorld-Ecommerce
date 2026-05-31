package com.example.webtmdt.repository;

import com.example.webtmdt.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    Optional<CartItem> findByCartIdAndVariantId(Long cartId, Long variantId);

    void deleteByCartIdAndVariantIdIn(Long cartId, java.util.List<Long> variantIds);
}
