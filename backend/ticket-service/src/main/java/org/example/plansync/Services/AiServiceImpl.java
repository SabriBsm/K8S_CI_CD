package org.example.plansync.Services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.example.plansync.Entities.AiGenerateRequest;
import org.example.plansync.Entities.AiGenerateResponse;
import org.example.plansync.Entities.Ticket;
import org.example.plansync.Entities.TicketSummary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service
public class AiServiceImpl implements IAiService {

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL    = "llama-3.1-8b-instant";

    @Value("${groq.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper       = new ObjectMapper();

    @Override
    public AiGenerateResponse generateTicketResponse(AiGenerateRequest req) {

        String systemPrompt = """
                Tu es un agent de support technique professionnel.
                Tu dois générer une réponse claire, professionnelle et utile pour un ticket de support.
                La réponse doit :
                - Être rédigée en français
                - Reconnaître le problème du client
                - Proposer une solution concrète ou des étapes de diagnostic
                - Rester concise (3-5 paragraphes maximum)
                - Avoir un ton professionnel et empathique
                Ne pas inclure de salutations génériques comme "Cher client".
                """;

        String userPrompt = buildUserPrompt(req);

        try {
            ObjectNode body = mapper.createObjectNode();
            body.put("model", MODEL);
            body.put("temperature", 0.7);
            body.put("max_tokens", 600);

            ArrayNode messages = body.putArray("messages");
            ObjectNode sysMsg = messages.addObject();
            sysMsg.put("role", "system");
            sysMsg.put("content", systemPrompt);
            ObjectNode userMsg = messages.addObject();
            userMsg.put("role", "user");
            userMsg.put("content", userPrompt);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            HttpEntity<String> entity = new HttpEntity<>(mapper.writeValueAsString(body), headers);
            ResponseEntity<String> response = restTemplate.exchange(GROQ_URL, HttpMethod.POST, entity, String.class);

            JsonNode root     = mapper.readTree(response.getBody());
            String   text     = root.path("choices").get(0).path("message").path("content").asText();
            int      totalTok = root.path("usage").path("total_tokens").asInt();
            String   usedModel = root.path("model").asText(MODEL);

            return new AiGenerateResponse(text.trim(), usedModel, totalTok);

        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération IA : " + e.getMessage(), e);
        }
    }

    @Override
    public TicketSummary generateTicketSummary(Ticket ticket, List<String> responses, List<String> chatMessages) {

        String systemPrompt = """
                Tu es un expert en gestion de tickets de support.
                Analyse le ticket et toutes ses interactions (réponses et messages de chat) puis génère un résumé structuré en JSON.
                Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après.
                Le JSON doit contenir exactement ces 4 clés :
                {
                  "problemSummary": "résumé clair du problème en 2-3 phrases",
                  "resolutionSteps": "étapes de résolution prises, séparées par des sauts de ligne",
                  "finalSolution": "solution finale appliquée en 1-2 phrases",
                  "suggestedTags": "tag1,tag2,tag3"
                }
                Rédige en français. Sois précis et concis.
                """;

        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("Ticket à analyser :\n\n");
        userPrompt.append("Référence : ").append(ticket.getReference()).append("\n");
        userPrompt.append("Titre : ").append(ticket.getTitle()).append("\n");
        userPrompt.append("Catégorie : ").append(ticket.getCategory()).append("\n");
        userPrompt.append("Priorité : ").append(ticket.getPriority()).append("\n");
        userPrompt.append("Description : ").append(ticket.getDescription()).append("\n");

        if (!responses.isEmpty()) {
            userPrompt.append("\nRéponses des agents :\n");
            responses.forEach(r -> userPrompt.append("- ").append(r).append("\n"));
        }
        if (!chatMessages.isEmpty()) {
            userPrompt.append("\nMessages du chat :\n");
            chatMessages.forEach(m -> userPrompt.append("- ").append(m).append("\n"));
        }

        try {
            ObjectNode body = mapper.createObjectNode();
            body.put("model", MODEL);
            body.put("temperature", 0.3);
            body.put("max_tokens", 800);

            ArrayNode messages = body.putArray("messages");
            ObjectNode sysMsg = messages.addObject();
            sysMsg.put("role", "system");
            sysMsg.put("content", systemPrompt);
            ObjectNode userMsg = messages.addObject();
            userMsg.put("role", "user");
            userMsg.put("content", userPrompt.toString());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            HttpEntity<String> entity = new HttpEntity<>(mapper.writeValueAsString(body), headers);
            ResponseEntity<String> response = restTemplate.exchange(GROQ_URL, HttpMethod.POST, entity, String.class);

            JsonNode root      = mapper.readTree(response.getBody());
            String   rawText   = root.path("choices").get(0).path("message").path("content").asText().trim();
            int      totalTok  = root.path("usage").path("total_tokens").asInt();
            String   usedModel = root.path("model").asText(MODEL);

            if (rawText.startsWith("```")) {
                rawText = rawText.replaceAll("```json", "").replaceAll("```", "").trim();
            }

            JsonNode json = mapper.readTree(rawText);

            return TicketSummary.builder()
                    .ticket(ticket)
                    .problemSummary(json.path("problemSummary").asText(""))
                    .resolutionSteps(json.path("resolutionSteps").asText(""))
                    .finalSolution(json.path("finalSolution").asText(""))
                    .suggestedTags(json.path("suggestedTags").asText(""))
                    .model(usedModel)
                    .tokensUsed(totalTok)
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du résumé : " + e.getMessage(), e);
        }
    }

    private String buildUserPrompt(AiGenerateRequest req) {
        StringBuilder sb = new StringBuilder();
        sb.append("Génère une réponse professionnelle pour le ticket suivant :\n\n");
        sb.append("Référence : ").append(req.getTicketId()).append("\n");
        sb.append("Titre : ").append(req.getTitle()).append("\n");
        sb.append("Catégorie : ").append(req.getCategory()).append("\n");
        sb.append("Priorité : ").append(req.getPriority()).append("\n");
        sb.append("Statut : ").append(req.getStatus()).append("\n");

        if (req.getDescription() != null && !req.getDescription().isBlank()) {
            sb.append("Description : ").append(req.getDescription()).append("\n");
        }
        if (req.getSubmittedBy() != null) {
            sb.append("Soumis par : ").append(req.getSubmittedBy()).append("\n");
        }
        if (req.getAssignedTo() != null) {
            sb.append("Assigné à : ").append(req.getAssignedTo()).append("\n");
        }

        List<String> prev = req.getPreviousResponses();
        if (prev != null && !prev.isEmpty()) {
            sb.append("\nRéponses précédentes :\n");
            prev.forEach(r -> sb.append("- ").append(r).append("\n"));
        }

        if (req.getAdditionalContext() != null && !req.getAdditionalContext().isBlank()) {
            sb.append("\nContexte supplémentaire : ").append(req.getAdditionalContext()).append("\n");
        }

        return sb.toString();
    }
}
