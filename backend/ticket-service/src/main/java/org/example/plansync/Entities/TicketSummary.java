package org.example.plansync.Entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "ticket_id", unique = true, nullable = false)
    @JsonBackReference
    private Ticket ticket;

    @Column(columnDefinition = "TEXT")
    private String problemSummary;

    @Column(columnDefinition = "TEXT")
    private String resolutionSteps;

    @Column(columnDefinition = "TEXT")
    private String finalSolution;

    private String suggestedTags;

    @CreationTimestamp
    private LocalDateTime generatedAt;

    private String model;

    private int tokensUsed;
}
