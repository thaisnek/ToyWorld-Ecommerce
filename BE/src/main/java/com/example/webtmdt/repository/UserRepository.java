package com.example.webtmdt.repository;

import com.example.webtmdt.entity.User;
import com.example.webtmdt.enums.UserRole;
import com.example.webtmdt.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUserName(String userName);
    Boolean existsByUserName(String userName);
    Boolean existsByEmail(String email);
    List<User> findByRoleAndStatus(UserRole role, UserStatus status);
}
