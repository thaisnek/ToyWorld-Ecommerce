package com.example.webtmdt.repository;

import com.example.webtmdt.entity.AddressUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface AddressUserRepository extends JpaRepository<AddressUser, Long> {

    List<AddressUser> findByUserId(Long userId);

    Optional<AddressUser> findByIdAndUserId(Long id, Long userId);

    boolean existsByUserId(Long userId);

    @Modifying
    @Query("UPDATE AddressUser a SET a.isDefault = false WHERE a.user.id = :userId")
    void clearDefaultByUserId(@Param("userId") Long userId);

    Optional<AddressUser> findFirstByUserIdAndIdNotOrderByCreatedAtDesc(Long userId, Long id);
}
