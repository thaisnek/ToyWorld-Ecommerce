package com.example.webtmdt.service.impl;

import com.example.webtmdt.dto.request.UpdateUserRoleRequest;
import com.example.webtmdt.dto.request.UpdateUserStatusRequest;
import com.example.webtmdt.dto.response.UserResponse;
import com.example.webtmdt.entity.User;
import com.example.webtmdt.enums.UserRole;
import com.example.webtmdt.enums.UserStatus;
import com.example.webtmdt.exception.AppException;
import com.example.webtmdt.exception.ResourceNotFoundException;
import com.example.webtmdt.mapper.UserMapper;
import com.example.webtmdt.repository.UserRepository;
import com.example.webtmdt.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable)
                .map(userMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getActiveDeliveryStaff() {
        return userMapper.toResponseList(userRepository.findByRoleAndStatus(UserRole.DELIVERY_STAFF, UserStatus.ACTIVE));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        User user = findUserOrThrow(id);
        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse updateUserStatus(Long id, UpdateUserStatusRequest request) {
        User user = findUserOrThrow(id);

        if (user.getRole().name().equals("ADMIN")) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không thể thay đổi trạng thái của ADMIN");
        }

        user.setStatus(request.getStatus());
        user = userRepository.save(user);

        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse updateUserRole(Long id, UpdateUserRoleRequest request) {
        User user = findUserOrThrow(id);

        // Optional: có thể chặn không cho tự đổi quyền của chính mình nếu lấy thêm username từ SecurityContext
        
        user.setRole(request.getRole());
        user = userRepository.save(user);

        return userMapper.toResponse(user);
    }

    private User findUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "id", id));
    }
}
