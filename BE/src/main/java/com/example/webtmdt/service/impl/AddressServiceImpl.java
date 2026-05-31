package com.example.webtmdt.service.impl;

import com.example.webtmdt.dto.request.AddressRequest;
import com.example.webtmdt.dto.response.AddressResponse;
import com.example.webtmdt.entity.AddressUser;
import com.example.webtmdt.entity.User;
import com.example.webtmdt.exception.ResourceNotFoundException;
import com.example.webtmdt.mapper.AddressMapper;
import com.example.webtmdt.repository.AddressUserRepository;
import com.example.webtmdt.repository.UserRepository;
import com.example.webtmdt.service.AddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AddressServiceImpl implements AddressService {

    private final AddressUserRepository addressRepository;
    private final UserRepository userRepository;
    private final AddressMapper addressMapper;

    @Override
    @Transactional
    public AddressResponse createAddress(String username, AddressRequest request) {
        User user = findUserOrThrow(username);

        boolean isFirstAddress = !addressRepository.existsByUserId(user.getId());
        boolean isDefault = isFirstAddress || Boolean.TRUE.equals(request.getIsDefault());

        if (isDefault && !isFirstAddress) {
            clearDefaultAddress(user.getId());
        }

        AddressUser address = AddressUser.builder()
                .user(user)
                .shipName(request.getFullName())
                .shipPhone(request.getPhone())
                .shipAddress(request.getFullAddress())
                .isDefault(isDefault)
                .build();

        address = addressRepository.save(address);
        return addressMapper.toResponse(address);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AddressResponse> getMyAddresses(String username) {
        User user = findUserOrThrow(username);
        List<AddressUser> addresses = addressRepository.findByUserId(user.getId());
        return addressMapper.toResponseList(addresses);
    }

    @Override
    @Transactional(readOnly = true)
    public AddressResponse getAddressById(String username, Long addressId) {
        User user = findUserOrThrow(username);
        AddressUser address = findAddressOrThrow(addressId, user.getId());
        return addressMapper.toResponse(address);
    }

    @Override
    @Transactional
    public AddressResponse updateAddress(String username, Long addressId, AddressRequest request) {
        User user = findUserOrThrow(username);
        AddressUser address = findAddressOrThrow(addressId, user.getId());

        if (Boolean.TRUE.equals(request.getIsDefault()) && !Boolean.TRUE.equals(address.getIsDefault())) {
            clearDefaultAddress(user.getId());
            address.setIsDefault(true);
        } else if (Boolean.FALSE.equals(request.getIsDefault()) && Boolean.TRUE.equals(address.getIsDefault())) {
            address.setIsDefault(false);
            // Tự động set 1 địa chỉ khác làm mặc định (nếu có)
            addressRepository.findFirstByUserIdAndIdNotOrderByCreatedAtDesc(user.getId(), addressId)
                    .ifPresent(fallback -> {
                        fallback.setIsDefault(true);
                        addressRepository.save(fallback);
                    });
        }

        address.setShipName(request.getFullName());
        address.setShipPhone(request.getPhone());
        address.setShipAddress(request.getFullAddress());

        address = addressRepository.save(address);
        return addressMapper.toResponse(address);
    }

    @Override
    @Transactional
    public void deleteAddress(String username, Long addressId) {
        User user = findUserOrThrow(username);
        AddressUser address = findAddressOrThrow(addressId, user.getId());
        
        boolean wasDefault = address.getIsDefault();
        addressRepository.delete(address);
        
        if (wasDefault) {
            // Nếu xóa địa chỉ mặc định, tự động set địa chỉ khác làm mặc định
            addressRepository.findFirstByUserIdAndIdNotOrderByCreatedAtDesc(user.getId(), addressId)
                    .ifPresent(fallback -> {
                        fallback.setIsDefault(true);
                        addressRepository.save(fallback);
                    });
        }
    }

    @Override
    @Transactional
    public AddressResponse setDefaultAddress(String username, Long addressId) {
        User user = findUserOrThrow(username);
        AddressUser address = findAddressOrThrow(addressId, user.getId());

        if (!Boolean.TRUE.equals(address.getIsDefault())) {
            clearDefaultAddress(user.getId());
            address.setIsDefault(true);
            address = addressRepository.save(address);
        }

        return addressMapper.toResponse(address);
    }

    // ==================== HELPER METHODS ====================

    private User findUserOrThrow(String username) {
        return userRepository.findByUserName(username)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "username", username));
    }

    private AddressUser findAddressOrThrow(Long addressId, Long userId) {
        return addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Địa chỉ", "id", addressId));
    }

    private void clearDefaultAddress(Long userId) {
        addressRepository.clearDefaultByUserId(userId);
    }
}
