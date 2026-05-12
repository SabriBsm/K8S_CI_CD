package org.example.plansync.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AiGenerateResponse {
    private String generatedText;
    private String model;
    private int    tokensUsed;
}
