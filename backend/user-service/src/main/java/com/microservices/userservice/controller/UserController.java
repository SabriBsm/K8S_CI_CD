package com.microservices.userservice.controller;

import com.microservices.userservice.dto.request.ForgotPasswordRequestDTO;
import com.microservices.userservice.dto.request.ResetPasswordRequestDTO;
import com.microservices.userservice.dto.request.ChangePasswordRequestDTO;
import com.microservices.userservice.dto.request.NotifyUserRequestDTO;
import com.microservices.userservice.dto.request.SessionUsageRequestDTO;
import com.microservices.userservice.dto.request.UserRequestDTO;
import com.microservices.userservice.dto.request.UpdateUserRequestDTO;
import com.microservices.userservice.dto.response.analytics.UsageDashboardDTO;
import com.microservices.userservice.dto.response.UserResponseDTO;
import com.microservices.userservice.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "Endpoints pour la gestion des utilisateurs")
public class UserController {

    private final UserService userService;

    @PostMapping
    @Operation(summary = "Créer un nouvel utilisateur")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Utilisateur créé avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides"),
            @ApiResponse(responseCode = "409", description = "L'utilisateur existe déjà")
    })
    public ResponseEntity<UserResponseDTO> createUser(@Valid @RequestBody UserRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userService.createUser(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour un utilisateur")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Utilisateur mis à jour avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    public ResponseEntity<UserResponseDTO> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequestDTO request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un utilisateur par ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Utilisateur récupéré avec succès"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    public ResponseEntity<UserResponseDTO> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping("/username/{username}")
    @Operation(summary = "Récupérer un utilisateur par nom d'utilisateur")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Utilisateur récupéré avec succès"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    public ResponseEntity<UserResponseDTO> getUserByUsername(@PathVariable String username) {
        return ResponseEntity.ok(userService.getUserByUsername(username));
    }

    @GetMapping("/email/{email}")
    @Operation(summary = "Récupérer un utilisateur par email")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Utilisateur récupéré avec succès"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    public ResponseEntity<UserResponseDTO> getUserByEmail(@PathVariable String email) {
        return ResponseEntity.ok(userService.getUserByEmail(email));
    }

    @GetMapping("/role/{role}")
    @Operation(summary = "Récupérer tous les utilisateurs avec un rôle spécifique")
    @ApiResponse(responseCode = "200", description = "Utilisateurs récupérés avec succès")
    public ResponseEntity<List<UserResponseDTO>> getUsersByRole(@PathVariable String role) {
        return ResponseEntity.ok(userService.getUsersByRole(role));
    }

    @GetMapping("/role/{role}/active")
    @Operation(summary = "Récupérer tous les utilisateurs actifs avec un rôle spécifique")
    @ApiResponse(responseCode = "200", description = "Utilisateurs récupérés avec succès")
    public ResponseEntity<List<UserResponseDTO>> getActiveUsersByRole(@PathVariable String role) {
        return ResponseEntity.ok(userService.getActiveUsersByRole(role));
    }

    @GetMapping
    @Operation(summary = "Récupérer tous les utilisateurs avec pagination")
    @ApiResponse(responseCode = "200", description = "Utilisateurs récupérés avec succès")
    public ResponseEntity<Page<UserResponseDTO>> getAllUsers(Pageable pageable) {
        return ResponseEntity.ok(userService.getAllUsers(pageable));
    }

    @GetMapping("/all")
    @Operation(summary = "Récupérer tous les utilisateurs")
    @ApiResponse(responseCode = "200", description = "Utilisateurs récupérés avec succès")
    public ResponseEntity<List<UserResponseDTO>> getAllUsersList() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un utilisateur")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Utilisateur supprimé avec succès"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/check/username/{username}")
    @Operation(summary = "Vérifier si un nom d'utilisateur existe")
    @ApiResponse(responseCode = "200", description = "Vérification effectuée")
    public ResponseEntity<Boolean> existsByUsername(@PathVariable String username) {
        return ResponseEntity.ok(userService.existsByUsername(username));
    }

    @GetMapping("/check/email/{email}")
    @Operation(summary = "Vérifier si un email existe")
    @ApiResponse(responseCode = "200", description = "Vérification effectuée")
    public ResponseEntity<Boolean> existsByEmail(@PathVariable String email) {
        return ResponseEntity.ok(userService.existsByEmail(email));
    }

    @PostMapping("/{id}/increment-failed-login")
    @Operation(summary = "Incrémenter les tentatives de connexion échouées")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Tentatives incrémentées"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    public ResponseEntity<Void> incrementFailedLoginAttempts(@PathVariable Long id) {
        userService.incrementFailedLoginAttempts(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reset-failed-login")
    @Operation(summary = "Réinitialiser les tentatives de connexion échouées")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Tentatives réinitialisées"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    public ResponseEntity<Void> resetFailedLoginAttempts(@PathVariable Long id) {
        userService.resetFailedLoginAttempts(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/change-password")
    @Operation(summary = "Changer le mot de passe d'un utilisateur")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Mot de passe modifié avec succès"),
            @ApiResponse(responseCode = "400", description = "Ancien mot de passe invalide ou données invalides"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    public ResponseEntity<Void> changePassword(
            @PathVariable Long id,
            @Valid @RequestBody ChangePasswordRequestDTO request) {
        userService.changePassword(id, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/notify")
    @Operation(summary = "Envoyer un email d'onboarding à l'utilisateur")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Notification envoyée avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    public ResponseEntity<Void> notifyUser(
            @PathVariable Long id,
            @Valid @RequestBody NotifyUserRequestDTO request) {
        userService.notifyUser(id, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/session-usage")
    @Operation(summary = "Enregistrer le temps passé dans l'application")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Temps de session enregistré avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    public ResponseEntity<UserResponseDTO> recordSessionUsage(
            @PathVariable Long id,
            @Valid @RequestBody SessionUsageRequestDTO request) {
        return ResponseEntity.ok(userService.recordSessionUsage(id, request));
    }

    @GetMapping("/analytics/usage")
    @Operation(summary = "Récupérer le classement global d'utilisation")
    @ApiResponse(responseCode = "200", description = "Classements récupérés avec succès")
    public ResponseEntity<UsageDashboardDTO> getUsageDashboard(
            @RequestParam(defaultValue = "Africa/Tunis") String timezone,
            @RequestParam(defaultValue = "10") Integer limit) {
        return ResponseEntity.ok(userService.getUsageDashboard(timezone, limit));
    }

    @PostMapping(value = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Mettre à jour la photo de profil de l'utilisateur")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Avatar mis à jour avec succès"),
            @ApiResponse(responseCode = "400", description = "Fichier invalide"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    public ResponseEntity<UserResponseDTO> uploadAvatar(
            @PathVariable Long id,
            @RequestParam("avatar") MultipartFile avatar) {
        return ResponseEntity.ok(userService.uploadAvatar(id, avatar));
    }


}

