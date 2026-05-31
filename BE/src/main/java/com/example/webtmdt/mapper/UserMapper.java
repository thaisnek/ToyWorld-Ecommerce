package com.example.webtmdt.mapper;

import com.example.webtmdt.dto.response.UserResponse;
import com.example.webtmdt.entity.User;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserResponse toResponse(User user);

    List<UserResponse> toResponseList(List<User> users);
}
