package com.microservices.projetservice.repository;

import com.microservices.projetservice.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    /**
     * Récupère tous les membres d'un projet
     */
    List<ProjectMember> findByProjectId(Long projectId);

    List<ProjectMember> findByProjectIdIn(Collection<Long> projectIds);

    /**
     * Récupère tous les projets d'un utilisateur
     */
    @Query("SELECT pm FROM ProjectMember pm WHERE pm.userId = :userId AND pm.isActive = true")
    List<ProjectMember> findByUserId(@Param("userId") String userId);

    /**
     * Vérifie si un utilisateur est membre d'un projet
     */
    Optional<ProjectMember> findByProjectIdAndUserId(Long projectId, String userId);

    /**
     * Récupère un membre actif d'un projet
     */
    Optional<ProjectMember> findByProjectIdAndUserIdAndIsActiveTrue(Long projectId, String userId);

    /**
     * Supprime tous les membres d'un projet
     */
    void deleteByProjectId(Long projectId);

    /**
     * Compte le nombre de membres actifs d'un projet
     */
    long countByProjectIdAndIsActiveTrue(Long projectId);

    /**
     * Récupère tous les projets managés par un utilisateur
     */
    @Query("SELECT pm FROM ProjectMember pm WHERE pm.userId = :userId AND pm.role = 'PROJECT_MANAGER' AND pm.isActive = true")
    List<ProjectMember> findManagedProjects(@Param("userId") String userId);
}

