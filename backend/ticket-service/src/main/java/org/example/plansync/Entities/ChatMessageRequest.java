package org.example.plansync.Entities;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ChatMessageRequest {
    private String senderUsername;
    private String content;
}
