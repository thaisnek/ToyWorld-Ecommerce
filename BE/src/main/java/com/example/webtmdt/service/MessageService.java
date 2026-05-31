package com.example.webtmdt.service;

import com.example.webtmdt.dto.request.SendMessageRequest;
import com.example.webtmdt.dto.response.ConversationResponse;
import com.example.webtmdt.dto.response.MessageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface MessageService {

    MessageResponse sendMessage(String username, SendMessageRequest request);

    Page<MessageResponse> getMessages(String username, Long conversationId, Pageable pageable);

    List<ConversationResponse> getMyConversations(String username);
}
