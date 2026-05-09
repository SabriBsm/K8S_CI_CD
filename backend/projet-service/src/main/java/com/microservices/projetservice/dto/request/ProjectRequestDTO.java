package com.microservices.projetservice.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.microservices.projetservice.enums.ProjectStatus;
import com.microservices.projetservice.enums.ProjectVisibility;
import java.util.List;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectRequestDTO {


    @NotBlank(message = "Le nom du projet est obligatoire")
    @Size(min = 3, max = 100, message = "Le nom doit contenir entre 3 et 100 caractères")
    @Pattern(regexp = "^[\\p{L}\\p{N}\\s\\-_,.:;()&'’/+]+$", message = "Le nom contient des caractères invalides")
    private String name;

    @Size(max = 500, message = "La description ne doit pas dépasser 500 caractères")
    private String description;

    @Size(max = 1000, message = "Les objectifs ne doivent pas dépasser 1000 caractères")
    private String objectives;

    @NotNull(message = "La date de début est obligatoire")
    //@FutureOrPresent(message = "La date de début doit être aujourd'hui ou dans le futur")
    private LocalDate startDate;

    @NotNull(message = "La date de fin est obligatoire")
   // @Future(message = "La date de fin doit être dans le futur")
    private LocalDate endDate;

    // ✅ PLUS DE @Builder.Default
    @DecimalMin(value = "0.0", message = "La progression ne peut pas être inférieure à 0")
    @DecimalMax(value = "100.0", message = "La progression ne peut pas dépasser 100")
    private Double progress;

    // ✅ PLUS DE @Builder.Default
    private ProjectStatus status;

    // ✅ PLUS DE @Builder.Default
    private ProjectVisibility visibility;

    private LocalDate actualEndDate;
    private Long budgetId;

    private String customerId; // Username du customer (optionnel à la création)

    private List<MilestoneRequestDTO> milestones;

    @AssertTrue(message = "La date de début doit être avant la date de fin")
    public boolean isStartDateBeforeEndDate() {
        if (startDate == null || endDate == null) return true;
        return startDate.isBefore(endDate) || startDate.isEqual(endDate);
    }

    @AssertTrue(message = "La date de réalisation ne peut pas être avant la date de début")
    public boolean isActualEndDateValid() {
        if (actualEndDate == null || startDate == null) return true;
        return !actualEndDate.isBefore(startDate);
    }
}