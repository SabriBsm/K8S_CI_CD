package com.microservices.projetservice.repository;

import com.microservices.projetservice.entity.ProjectMeeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface ProjectMeetingRepository extends JpaRepository<ProjectMeeting, Long> {

    @Query("""
            select m
            from ProjectMeeting m
            where m.project.id = :projectId
            order by m.meetingDate asc, m.startTime asc
            """)
    List<ProjectMeeting> findByProjectIdOrderByMeetingDateAscStartTimeAsc(@Param("projectId") Long projectId);

    List<ProjectMeeting> findByProjectIdIn(Collection<Long> projectIds);

    @Query("""
            select m
            from ProjectMeeting m
            where m.project.id = :projectId
            and m.meetingDate >= :meetingDate
            order by m.meetingDate asc, m.startTime asc
            """)
    List<ProjectMeeting> findUpcomingByProjectId(@Param("projectId") Long projectId, @Param("meetingDate") LocalDate meetingDate);

    @Query("""
            select m
            from ProjectMeeting m
            where m.project.id = :projectId
            and m.meetingDate < :meetingDate
            order by m.meetingDate desc, m.startTime desc
            """)
    List<ProjectMeeting> findPastByProjectId(@Param("projectId") Long projectId, @Param("meetingDate") LocalDate meetingDate);

    @Query("""
            select m
            from ProjectMeeting m
            where m.createdBy = :createdBy
            order by m.meetingDate asc, m.startTime asc
            """)
    List<ProjectMeeting> findByCreatedByOrderByMeetingDateAscStartTimeAsc(@Param("createdBy") String createdBy);
}
