package org.example.plansync.Repositories;

import org.example.plansync.Entities.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChannelRepo extends JpaRepository<Channel, Long> {

    Optional<Channel> findByTicketId(Long ticketId);

    Optional<Channel> findByName(String name);
}
