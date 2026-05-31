package com.example.webtmdt.mapper;

import com.example.webtmdt.dto.response.TypeVoucherResponse;
import com.example.webtmdt.dto.response.VoucherResponse;
import com.example.webtmdt.entity.TypeVoucher;
import com.example.webtmdt.entity.Voucher;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface VoucherMapper {

    @Mapping(source = "typeVoucher.typeVoucher", target = "typeVoucher")
    @Mapping(source = "typeVoucher.value", target = "value")
    @Mapping(source = "typeVoucher.maxValue", target = "maxValue")
    @Mapping(source = "typeVoucher.minValue", target = "minValue")
    @Mapping(target = "usedCount", ignore = true) // tính trong service
    VoucherResponse toResponse(Voucher voucher);

    List<VoucherResponse> toResponseList(List<Voucher> vouchers);

    TypeVoucherResponse toTypeResponse(TypeVoucher typeVoucher);

    List<TypeVoucherResponse> toTypeResponseList(List<TypeVoucher> types);
}
