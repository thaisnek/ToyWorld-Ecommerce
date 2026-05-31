package com.example.webtmdt.service.impl;

import com.example.webtmdt.dto.request.SupplierRequest;
import com.example.webtmdt.dto.response.SupplierResponse;
import com.example.webtmdt.entity.Supplier;
import com.example.webtmdt.exception.AppException;
import com.example.webtmdt.exception.ResourceNotFoundException;
import com.example.webtmdt.mapper.SupplierMapper;
import com.example.webtmdt.repository.SupplierRepository;
import com.example.webtmdt.service.SupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository supplierRepository;
    private final SupplierMapper supplierMapper;

    @Override
    @Transactional
    public SupplierResponse createSupplier(SupplierRequest request) {
        if (supplierRepository.existsByName(request.getName())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Tên nhà cung cấp đã tồn tại!");
        }

        Supplier supplier = Supplier.builder()
                .name(request.getName())
                .contactPerson(request.getContactPerson())
                .email(request.getContactEmail())
                .phone(request.getContactPhone())
                .address(request.getAddress())
                .contractInfo(request.getContractInfo())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        supplier = supplierRepository.save(supplier);
        return supplierMapper.toResponse(supplier);
    }

    @Override
    @Transactional(readOnly = true)
    public SupplierResponse getSupplierById(Long id) {
        Supplier supplier = findSupplierOrThrow(id);
        return supplierMapper.toResponse(supplier);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SupplierResponse> getAllSuppliers(Pageable pageable) {
        return supplierRepository.findAll(pageable)
                .map(supplierMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SupplierResponse> getAllSuppliersList() {
        return supplierMapper.toResponseList(supplierRepository.findAll());
    }

    @Override
    @Transactional
    public SupplierResponse updateSupplier(Long id, SupplierRequest request) {
        Supplier supplier = findSupplierOrThrow(id);

        if (!supplier.getName().equals(request.getName()) && supplierRepository.existsByName(request.getName())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Tên nhà cung cấp đã tồn tại!");
        }

        supplier.setName(request.getName());
        supplier.setContactPerson(request.getContactPerson());
        supplier.setEmail(request.getContactEmail());
        supplier.setPhone(request.getContactPhone());
        supplier.setAddress(request.getAddress());
        supplier.setContractInfo(request.getContractInfo());
        if (request.getActive() != null) {
            supplier.setActive(request.getActive());
        }

        supplier = supplierRepository.save(supplier);
        return supplierMapper.toResponse(supplier);
    }

    @Override
    @Transactional
    public void deleteSupplier(Long id) {
        Supplier supplier = findSupplierOrThrow(id);
        
        // Cần check xem có product nào đang dùng supplier này không trước khi xóa
        if (!supplier.getProducts().isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể xóa nhà cung cấp đang có sản phẩm!");
        }
        
        supplierRepository.delete(supplier);
    }

    private Supplier findSupplierOrThrow(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nhà cung cấp", "id", id));
    }
}
