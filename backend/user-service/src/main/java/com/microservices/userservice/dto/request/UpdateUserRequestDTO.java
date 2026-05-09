package com.microservices.userservice.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserRequestDTO {

    @Size(max = 50, message = "Le prénom ne doit pas dépasser 50 caractères")
    private String firstName;

    @Size(max = 50, message = "Le nom ne doit pas dépasser 50 caractères")
    private String lastName;

    @Size(max = 5000, message = "L'URL de l'avatar ne doit pas dépasser 5000 caractères")
    private String avatarUrl;

    @Size(max = 20, message = "Le numéro de téléphone ne doit pas dépasser 20 caractères")
    @Pattern(
            regexp = "^$|^\\+?[0-9][0-9\\s\\-()]{6,19}$",
            message = "Le numero de telephone est invalide"
    )
    private String phoneNumber;

    private String status;

    @Size(max = 50, message = "Le rôle ne doit pas dépasser 50 caractères")
    private String role;

    @Size(max = 50, message = "Le fuseau horaire ne doit pas dépasser 50 caractères")
    private String timezone;

    @Size(max = 20, message = "La langue ne doit pas dépasser 20 caractères")
    private String language;

    private Boolean mfaEnabled;
}
