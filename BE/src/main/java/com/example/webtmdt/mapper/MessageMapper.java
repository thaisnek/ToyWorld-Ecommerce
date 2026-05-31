package com.example.webtmdt.mapper;

import com.example.webtmdt.dto.response.MessageResponse;
import com.example.webtmdt.entity.Message;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface MessageMapper {

    @Mapping(source = "user.id", target = "senderId")
    @Mapping(source = "user.fullName", target = "senderName")
    MessageResponse toResponse(Message message);
}
