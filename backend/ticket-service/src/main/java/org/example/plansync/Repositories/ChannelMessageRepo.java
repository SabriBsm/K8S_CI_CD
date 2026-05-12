package org.example.plansync.Repositories;

import org.example.plansync.Entities.ChannelMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChannelMessageRepo extends JpaRepository<ChannelMessage, Long> {

    List<ChannelMessage> findByChannelIdOrderBySentAtAsc(Long channelId);
}
