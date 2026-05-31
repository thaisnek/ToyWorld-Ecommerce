package com.example.webtmdt.service;

import com.example.webtmdt.dto.request.SupplierRequest;
import com.example.webtmdt.dto.response.SupplierResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface SupplierService {

    SupplierResponse createSupplier(SupplierRequest request);

    SupplierResponse getSupplierById(Long id);

    Page<SupplierResponse> getAllSuppliers(Pageable pageable);

    List<SupplierResponse> getAllSuppliersList();

    SupplierResponse updateSupplier(Long id, SupplierRequest request);

    void deleteSupplier(Long id);
}
