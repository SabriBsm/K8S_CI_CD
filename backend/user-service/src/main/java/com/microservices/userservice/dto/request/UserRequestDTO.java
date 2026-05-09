package com.microservices.userservice.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.microservices.userservice.validation.PasswordPolicy;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRequestDTO {

    private String username;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    private String email;

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Size(min = 8, max = 72, message = "Le mot de passe doit contenir entre 8 et 72 caractères")
    @PasswordPolicy
    private String password;

    @Size(max = 50, message = "Le prénom ne doit pas dépasser 50 caractères")
    private String firstName;

    @Size(max = 50, message = "Le nom ne doit pas dépasser 50 caractères")
    private String lastName;

    @Size(max = 20, message = "Le numéro de téléphone ne doit pas dépasser 20 caractères")
    @Pattern(
            regexp = "^$|^\\+?[0-9][0-9\\s\\-()]{6,19}$",
            message = "Le numero de telephone est invalide"
    )
    private String phoneNumber;

    @Size(max = 50, message = "Le fuseau horaire ne doit pas dépasser 50 caractères")
    private String timezone;

    @Size(max = 20, message = "La langue ne doit pas dépasser 20 caractères")
    private String language;

    @NotBlank(message = "Le rôle est obligatoire")
    private String role;

    private String status;
}
