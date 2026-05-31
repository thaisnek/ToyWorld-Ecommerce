package com.example.webtmdt.service.impl;

import com.example.webtmdt.dto.request.SendMessageRequest;
import com.example.webtmdt.dto.response.ConversationResponse;
import com.example.webtmdt.dto.response.MessageResponse;
import com.example.webtmdt.entity.Conversation;
import com.example.webtmdt.entity.Message;
import com.example.webtmdt.entity.User;
import com.example.webtmdt.exception.AppException;
import com.example.webtmdt.exception.ResourceNotFoundException;
import com.example.webtmdt.mapper.MessageMapper;
import com.example.webtmdt.repository.ConversationRepository;
import com.example.webtmdt.repository.MessageRepository;
import com.example.webtmdt.repository.UserRepository;
import com.example.webtmdt.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final MessageMapper messageMapper;

    @Override
    @Transactional
    public MessageResponse sendMessage(String username, SendMessageRequest request) {
        User sender = findUserOrThrow(username);
        User receiver = userRepository.findByUserName(request.getReceiverUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Người nhận", "username", request.getReceiverUsername()));

        if (sender.getId().equals(receiver.getId())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể gửi tin nhắn cho chính mình");
        }

        // Tìm hoặc tạo conversation
        Conversation conversation = conversationRepository
                .findByUserPair(sender.getId(), receiver.getId())
                .orElseGet(() -> {
                    Conversation newConv = Conversation.builder()
                            .userOne(sender)
                            .userTwo(receiver)
                            .build();
                    return conversationRepository.save(newConv);
                });

        Message message = Message.builder()
                .user(sender)
                .conversation(conversation)
                .content(request.getContent())
                .build();

        message = messageRepository.save(message);
        return messageMapper.toResponse(message);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<MessageResponse> getMessages(String username, Long conversationId, Pageable pageable) {
        User user = findUserOrThrow(username);

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Cuộc trò chuyện", "id", conversationId));

        // Check quyền truy cập: Admin và Sales được phép xem mọi cuộc trò chuyện
        boolean isStaff = user.getRole().name().equals("ADMIN") || user.getRole().name().equals("SALES_STAFF");
        if (!isStaff && !conversation.getUserOne().getId().equals(user.getId())
                && !conversation.getUserTwo().getId().equals(user.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền xem cuộc trò chuyện này");
        }

        return messageRepository.findByConversationId(conversationId, pageable)
                .map(messageMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> getMyConversations(String username) {
        User user = findUserOrThrow(username);

        // Admin và Sales được xem toàn bộ Conversation của hệ thống
        boolean isStaff = user.getRole().name().equals("ADMIN") || user.getRole().name().equals("SALES_STAFF");
        List<Conversation> conversations = isStaff 
                ? conversationRepository.findAll() 
                : conversationRepository.findByUserId(user.getId());

        return conversations.stream()
                .map(conv -> {
                    User otherUser = conv.getUserOne().getId().equals(user.getId())
                            ? conv.getUserTwo()
                            : conv.getUserOne();

                    // Nếu Staff đang xem cuộc hội thoại của khách (mà Staff không phải userOne/userTwo)
                    // thì mặc định hiển thị tên của người bắt đầu cuộc trò chuyện (thường là khách hàng)
                    if (isStaff && !conv.getUserOne().getId().equals(user.getId()) && !conv.getUserTwo().getId().equals(user.getId())) {
                        otherUser = conv.getUserOne();
                    }

                    // Lấy tin nhắn cuối
                    String lastMsg = null;
                    java.time.LocalDateTime lastMsgAt = null;
                    if (!conv.getMessages().isEmpty()) {
                        Message last = conv.getMessages().get(conv.getMessages().size() - 1);
                        lastMsg = last.getContent();
                        lastMsgAt = last.getCreatedAt();
                    }

                    return ConversationResponse.builder()
                            .id(conv.getId())
                            .otherUserId(otherUser.getId())
                            .otherUserName(otherUser.getUserName())
                            .otherFullName(otherUser.getFullName())
                            .lastMessage(lastMsg)
                            .lastMessageAt(lastMsgAt)
                            .createdAt(conv.getCreatedAt())
                            .build();
                })
                .collect(Collectors.toList());
    }

    private User findUserOrThrow(String username) {
        return userRepository.findByUserName(username)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "username", username));
    }
}
