package org.example.plansync.Entities;

import lombok.Data;

@Data
public class WebRtcSignalMessage {
    private String type;
    private String from;
    private String to;
    private Object payload;
}
