package com.example.webtmdt.mapper;

import com.example.webtmdt.dto.response.LoyaltyAccountResponse;
import com.example.webtmdt.dto.response.LoyaltyTransactionResponse;
import com.example.webtmdt.entity.LoyaltyAccount;
import com.example.webtmdt.entity.LoyaltyTransaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface LoyaltyMapper {

    @Mapping(source = "user.userName", target = "userName")
    LoyaltyAccountResponse toAccountResponse(LoyaltyAccount account);

    @Mapping(source = "order.id", target = "orderId")
    LoyaltyTransactionResponse toTransactionResponse(LoyaltyTransaction transaction);
}
