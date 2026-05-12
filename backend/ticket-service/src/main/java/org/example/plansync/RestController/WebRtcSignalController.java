package org.example.plansync.RestController;

import org.example.plansync.Entities.WebRtcSignalMessage;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class WebRtcSignalController {

    @MessageMapping("/channels/{channelId}/signal")
    @SendTo("/topic/channels/{channelId}/signal")
    public WebRtcSignalMessage relaySignal(
            @DestinationVariable Long channelId,
            WebRtcSignalMessage signal) {
        return signal;
    }
}
