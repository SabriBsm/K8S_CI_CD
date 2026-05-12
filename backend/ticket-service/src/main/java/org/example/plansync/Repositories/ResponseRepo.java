package org.example.plansync.Repositories;

import org.example.plansync.Entities.Response;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResponseRepo extends JpaRepository<Response, Long> {

    List<Response> findByTicketId(Long ticketId);

    List<Response> findByRespondedBy(String respondedBy);
}
