package org.example.plansync.Services;

import org.example.plansync.Entities.Response;

import java.util.List;

public interface IResponseService {

    List<Response> retrieveAllResponses();

    Response retrieveResponse(Long responseId);

    List<Response> retrieveResponsesByTicket(Long ticketId);

    Response addResponse(Long ticketId, Response response, String username, String userEmail);

    Response updateResponse(Response response);

    void removeResponse(Long responseId);
}
