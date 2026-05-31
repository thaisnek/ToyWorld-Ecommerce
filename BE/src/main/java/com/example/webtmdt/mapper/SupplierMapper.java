package com.example.webtmdt.mapper;

import com.example.webtmdt.dto.response.SupplierResponse;
import com.example.webtmdt.entity.Supplier;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface SupplierMapper {

    @Mapping(source = "email", target = "contactEmail")
    @Mapping(source = "phone", target = "contactPhone")
    SupplierResponse toResponse(Supplier supplier);

    List<SupplierResponse> toResponseList(List<Supplier> suppliers);
}
