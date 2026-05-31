package com.example.webtmdt.service;

import com.example.webtmdt.dto.request.AddressRequest;
import com.example.webtmdt.dto.response.AddressResponse;

import java.util.List;

public interface AddressService {

    AddressResponse createAddress(String username, AddressRequest request);

    List<AddressResponse> getMyAddresses(String username);

    AddressResponse getAddressById(String username, Long addressId);

    AddressResponse updateAddress(String username, Long addressId, AddressRequest request);

    void deleteAddress(String username, Long addressId);

    AddressResponse setDefaultAddress(String username, Long addressId);
}
