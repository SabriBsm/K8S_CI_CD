package org.example.plansync.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.plansync.Entities.Response;
import org.example.plansync.Services.IResponseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Response Management")
@RequestMapping("/api/response")
public class ResponseController {

    private final IResponseService iResponseService;

    @Operation(description = "Retrieve all responses")
    @GetMapping("/getAll")
    public List<Response> getAll() {
        return iResponseService.retrieveAllResponses();
    }

    @Operation(description = "Retrieve a response by id")
    @GetMapping("/getResponse/{id}")
    public Response getResponse(@PathVariable Long id) {
        return iResponseService.retrieveResponse(id);
    }

    @Operation(description = "Retrieve all responses for a specific ticket")
    @GetMapping("/getByTicket/{ticketId}")
    public List<Response> getByTicket(@PathVariable Long ticketId) {
        return iResponseService.retrieveResponsesByTicket(ticketId);
    }

    @Operation(description = "Add a response to a ticket. respondedBy est rempli automatiquement depuis l'en-tête X-Username")
    @PostMapping("/addResponse/{ticketId}")
    public Response addResponse(
            @PathVariable Long ticketId,
            @RequestBody Response response,
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestHeader(value = "X-PlanSync-User-Email", required = false) String userEmail) {
        if (username != null && !username.isBlank()) {
            response.setRespondedBy(username);
        } else if (userEmail != null && !userEmail.isBlank()) {
            response.setRespondedBy(userEmail);
        }
        return iResponseService.addResponse(ticketId, response, username, userEmail);
    }

    @Operation(description = "Update an existing response")
    @PutMapping("/updateResponse")
    public Response updateResponse(@RequestBody Response response) {
        return iResponseService.updateResponse(response);
    }

    @Operation(description = "Delete a response by id")
    @DeleteMapping("/deleteResponse/{id}")
    public void deleteResponse(@PathVariable Long id) {
        iResponseService.removeResponse(id);
    }

    @Operation(description = "Upload an attachment file for a response (max 10MB)")
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadAttachment(
            @RequestParam("file") MultipartFile file) throws IOException {

        String uploadDir = "uploads/responses/";
        Files.createDirectories(Paths.get(uploadDir));

        String originalName = Paths.get(file.getOriginalFilename()).getFileName().toString();
        String storedName   = UUID.randomUUID() + "_" + originalName;
        Files.copy(file.getInputStream(), Paths.get(uploadDir + storedName),
                StandardCopyOption.REPLACE_EXISTING);

        return ResponseEntity.ok(Map.of(
                "url",          "/uploads/responses/" + storedName,
                "originalName", originalName,
                "size",         String.valueOf(file.getSize())
        ));
    }
}
