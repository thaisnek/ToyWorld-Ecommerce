package com.example.webtmdt.repository;

import com.example.webtmdt.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("SELECT c FROM Conversation c WHERE (c.userOne.id = :userId OR c.userTwo.id = :userId)")
    List<Conversation> findByUserId(@Param("userId") Long userId);

    @Query("SELECT c FROM Conversation c WHERE " +
            "(c.userOne.id = :userId1 AND c.userTwo.id = :userId2) OR " +
            "(c.userOne.id = :userId2 AND c.userTwo.id = :userId1)")
    Optional<Conversation> findByUserPair(@Param("userId1") Long userId1, @Param("userId2") Long userId2);
}
