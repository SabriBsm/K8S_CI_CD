package com.microservices.userservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotifyUserRequestDTO {

    @NotBlank(message = "Le mot de passe temporaire est obligatoire")
    @Size(min = 8, message = "Le mot de passe temporaire doit contenir au moins 8 caractères")
    private String temporaryPassword;
}

