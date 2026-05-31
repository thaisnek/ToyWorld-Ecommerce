package com.example.webtmdt.service.impl;

import com.example.webtmdt.dto.response.LoyaltyAccountResponse;
import com.example.webtmdt.dto.response.LoyaltyTransactionResponse;
import com.example.webtmdt.entity.*;
import com.example.webtmdt.enums.LoyaltyTransactionType;
import com.example.webtmdt.exception.ResourceNotFoundException;
import com.example.webtmdt.mapper.LoyaltyMapper;
import com.example.webtmdt.repository.LoyaltyAccountRepository;
import com.example.webtmdt.repository.LoyaltyPolicyRepository;
import com.example.webtmdt.repository.LoyaltyTransactionRepository;
import com.example.webtmdt.repository.UserRepository;
import com.example.webtmdt.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoyaltyServiceImpl implements LoyaltyService {

    private final LoyaltyAccountRepository accountRepository;
    private final LoyaltyTransactionRepository transactionRepository;
    private final LoyaltyPolicyRepository policyRepository;
    private final UserRepository userRepository;
    private final LoyaltyMapper loyaltyMapper;

    @Override
    @Transactional
    public void earnPoints(User user, Order order) {
        if (transactionRepository.existsByOrderIdAndType(order.getId(), LoyaltyTransactionType.EARN)) {
            log.info("Order {} already earned loyalty points", order.getOrderCode());
            return;
        }

        LoyaltyPolicy policy = policyRepository.findByEnabledTrue().orElse(null);
        if (policy == null) {
            log.info("Không có chính sách tích điểm nào đang hoạt động");
            return;
        }

        // Tính điểm: totalAmount / amountPerPoint
        long points = order.getTotalAmount()
                .divide(policy.getAmountPerPoint(), 0, RoundingMode.FLOOR)
                .longValue();

        if (points <= 0) return;

        // Lấy hoặc tạo loyalty account
        LoyaltyAccount account = accountRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    LoyaltyAccount newAccount = LoyaltyAccount.builder()
                            .user(user)
                            .currentPoints(0L)
                            .lifetimeEarnedPoints(0L)
                            .lifetimeSpentPoints(0L)
                            .build();
                    return accountRepository.save(newAccount);
                });

        account.setCurrentPoints(account.getCurrentPoints() + points);
        account.setLifetimeEarnedPoints(account.getLifetimeEarnedPoints() + points);
        accountRepository.save(account);

        // Tạo transaction
        LoyaltyTransaction transaction = LoyaltyTransaction.builder()
                .user(user)
                .order(order)
                .pointsChange(points)
                .balanceAfter(account.getCurrentPoints())
                .type(LoyaltyTransactionType.EARN)
                .note("Tích điểm từ đơn hàng " + order.getOrderCode())
                .build();
        transactionRepository.save(transaction);

        log.info("User {} earned {} points from order {}", user.getUserName(), points, order.getOrderCode());
    }

    @Override
    @Transactional(readOnly = true)
    public LoyaltyAccountResponse getMyLoyaltyAccount(String username) {
        User user = userRepository.findByUserName(username)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "username", username));

        LoyaltyAccount account = accountRepository.findByUserId(user.getId())
                .orElseGet(() -> LoyaltyAccount.builder()
                        .user(user)
                        .userId(user.getId())
                        .currentPoints(0L)
                        .lifetimeEarnedPoints(0L)
                        .lifetimeSpentPoints(0L)
                        .build());

        return loyaltyMapper.toAccountResponse(account);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<LoyaltyTransactionResponse> getMyTransactions(String username, Pageable pageable) {
        User user = userRepository.findByUserName(username)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "username", username));
        return transactionRepository.findByUserId(user.getId(), pageable)
                .map(loyaltyMapper::toTransactionResponse);
    }
}
