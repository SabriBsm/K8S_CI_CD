package org.example.plansync.Services;

import lombok.RequiredArgsConstructor;
import org.example.plansync.Entities.Response;
import org.example.plansync.Entities.Ticket;
import org.example.plansync.Entities.TicketStatus;
import org.example.plansync.Repositories.ResponseRepo;
import org.example.plansync.Repositories.TicketRepo;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import static org.springframework.http.HttpStatus.FORBIDDEN;

@Service
@RequiredArgsConstructor
public class ResponseServiceImpl implements IResponseService {

    private final ResponseRepo responseRepo;
    private final TicketRepo ticketRepo;

    @Override
    public List<Response> retrieveAllResponses() {
        return responseRepo.findAll();
    }

    @Override
    public Response retrieveResponse(Long responseId) {
        return responseRepo.findById(responseId).get();
    }

    @Override
    public List<Response> retrieveResponsesByTicket(Long ticketId) {
        return responseRepo.findByTicketId(ticketId);
    }

    @Override
    public Response addResponse(Long ticketId, Response response, String username, String userEmail) {
        Ticket ticket = ticketRepo.findById(ticketId).get();
        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new IllegalStateException("Cannot add a response to a closed ticket.");
        }

        boolean isCreator = matchesIdentity(username, ticket.getSubmittedBy())
                || matchesIdentity(userEmail, ticket.getSubmittedBy());
        boolean isAssignee = matchesIdentity(username, ticket.getAssignedTo())
                || matchesIdentity(userEmail, ticket.getAssignedTo());
        if (!isCreator && !isAssignee) {
            throw new ResponseStatusException(FORBIDDEN, "Only ticket creator or assigned user can add response");
        }

        response.setTicket(ticket);
        return responseRepo.save(response);
    }

    private boolean matchesIdentity(String sessionIdentity, String storedIdentity) {
        if (sessionIdentity == null || sessionIdentity.isBlank() || storedIdentity == null || storedIdentity.isBlank()) {
            return false;
        }

        String session = sessionIdentity.trim().toLowerCase();
        String stored = storedIdentity.trim().toLowerCase();
        if (session.equals(stored)) {
            return true;
        }

        // support username/email cross-format comparison:
        // "alaeddine.lefi@gmail.com" should match "alaeddine.lefi"
        String sessionLogin = session.contains("@") ? session.substring(0, session.indexOf('@')) : session;
        String storedLogin = stored.contains("@") ? stored.substring(0, stored.indexOf('@')) : stored;
        return sessionLogin.equals(storedLogin);
    }

    @Override
    public Response updateResponse(Response response) {
        Response existing = responseRepo.findById(response.getId()).get();
        if (existing.getTicket().getStatus() == TicketStatus.CLOSED) {
            throw new IllegalStateException("Cannot edit a response on a closed ticket.");
        }
        existing.setContent(response.getContent());
        existing.setRespondedBy(response.getRespondedBy());
        existing.setAttachment(response.getAttachment());
        return responseRepo.save(existing);
    }

    @Override
    public void removeResponse(Long responseId) {
        Response existing = responseRepo.findById(responseId).get();
        if (existing.getTicket().getStatus() == TicketStatus.CLOSED) {
            throw new IllegalStateException("Cannot delete a response from a closed ticket.");
        }
        responseRepo.deleteById(responseId);
    }
}
