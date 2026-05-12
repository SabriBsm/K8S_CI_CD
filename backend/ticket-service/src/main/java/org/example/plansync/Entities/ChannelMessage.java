package org.example.plansync.Entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ChannelMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false)
    private String senderUsername;

    @JsonBackReference
    @ManyToOne
    @JoinColumn(name = "channel_id", nullable = false)
    private Channel channel;

    @CreationTimestamp
    private LocalDateTime sentAt;
}
