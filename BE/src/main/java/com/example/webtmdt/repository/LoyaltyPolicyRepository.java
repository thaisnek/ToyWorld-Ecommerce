package com.example.webtmdt.repository;

import com.example.webtmdt.entity.LoyaltyPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LoyaltyPolicyRepository extends JpaRepository<LoyaltyPolicy, Long> {

    Optional<LoyaltyPolicy> findByEnabledTrue();
}
