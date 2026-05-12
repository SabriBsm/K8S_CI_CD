package org.example.plansync.RestController;

import org.example.plansync.Entities.AiGenerateRequest;
import org.example.plansync.Entities.AiGenerateResponse;
import org.example.plansync.Services.IAiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final IAiService aiService;

    public AiController(IAiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/generate-response")
    public ResponseEntity<AiGenerateResponse> generateResponse(@RequestBody AiGenerateRequest request) {
        return ResponseEntity.ok(aiService.generateTicketResponse(request));
    }
}
