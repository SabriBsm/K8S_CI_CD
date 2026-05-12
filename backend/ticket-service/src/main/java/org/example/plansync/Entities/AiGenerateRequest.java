package org.example.plansync.Entities;

import lombok.Data;
import java.util.List;

@Data
public class AiGenerateRequest {
    private Long   ticketId;
    private String title;
    private String description;
    private String category;
    private String priority;
    private String status;
    private String submittedBy;
    private String assignedTo;
    private List<String> previousResponses;
    private String additionalContext;
}
