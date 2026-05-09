package com.microservices.projetservice.service.interfaces;

import com.microservices.projetservice.dto.request.MilestoneRequestDTO;
import com.microservices.projetservice.dto.response.MilestoneResponseDTO;
import com.microservices.projetservice.enums.MilestoneStatus;
import java.time.LocalDate;
import java.util.List;

public interface MilestoneService {
    List<MilestoneResponseDTO> getAllMilestones(String userId);
    MilestoneResponseDTO getMilestoneById(Long id, String userId);
    MilestoneResponseDTO createMilestone(MilestoneRequestDTO request, String userId);
    MilestoneResponseDTO updateMilestone(Long id, MilestoneRequestDTO request, String userId);
    void deleteMilestone(Long id, String userId);
    List<MilestoneResponseDTO> getMilestonesByProjectId(Long projectId, String userId);
    List<MilestoneResponseDTO> getMilestonesByStatus(MilestoneStatus status, String userId);
    List<MilestoneResponseDTO> getCriticalMilestones(String userId);
    List<MilestoneResponseDTO> getMilestonesByProjectIdAndStatus(Long projectId, MilestoneStatus status, String userId);
    List<MilestoneResponseDTO> getOverdueMilestones(String userId);
    List<MilestoneResponseDTO> getUpcomingMilestones(LocalDate withinDays, String userId);
    List<MilestoneResponseDTO> getMilestonesDueBetween(LocalDate startDate, LocalDate endDate, String userId);
    MilestoneResponseDTO markAsAchieved(Long id, LocalDate actualCompletionDate, String userId);
    MilestoneResponseDTO updateStatus(Long id, MilestoneStatus status, String userId);
    void updateOverdueMilestones(String userId);
}
