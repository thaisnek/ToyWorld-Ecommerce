package com.example.webtmdt.mapper;

import com.example.webtmdt.dto.response.AddressResponse;
import com.example.webtmdt.entity.AddressUser;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface AddressMapper {

    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "shipName", target = "fullName")
    @Mapping(source = "shipPhone", target = "phone")
    @Mapping(source = "shipAddress", target = "fullAddress")
    AddressResponse toResponse(AddressUser addressUser);

    List<AddressResponse> toResponseList(List<AddressUser> addressUsers);
}
