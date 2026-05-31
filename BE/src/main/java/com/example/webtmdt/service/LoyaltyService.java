package com.example.webtmdt.service;

import com.example.webtmdt.dto.response.LoyaltyAccountResponse;
import com.example.webtmdt.dto.response.LoyaltyTransactionResponse;
import com.example.webtmdt.entity.Order;
import com.example.webtmdt.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface LoyaltyService {

    /** Tích điểm từ đơn hàng hoàn thành */
    void earnPoints(User user, Order order);

    LoyaltyAccountResponse getMyLoyaltyAccount(String username);

    Page<LoyaltyTransactionResponse> getMyTransactions(String username, Pageable pageable);
}
