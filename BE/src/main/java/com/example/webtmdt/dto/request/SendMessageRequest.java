package com.example.webtmdt.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SendMessageRequest {

    @NotBlank(message = "Username người nhận không được để trống")
    private String receiverUsername;

    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    private String content;
}
