package com.example.webtmdt.service;

import com.example.webtmdt.dto.request.ChangePasswordRequest;
import com.example.webtmdt.dto.request.LoginRequest;
import com.example.webtmdt.dto.request.RegisterRequest;
import com.example.webtmdt.dto.request.UpdateProfileRequest;
import com.example.webtmdt.dto.response.AuthResponse;
import com.example.webtmdt.dto.response.UserProfileResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    UserProfileResponse getMyProfile(String username);

    UserProfileResponse updateProfile(String username, UpdateProfileRequest request);

    void changePassword(String username, ChangePasswordRequest request);
}
