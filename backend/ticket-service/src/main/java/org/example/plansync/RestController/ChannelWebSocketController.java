package org.example.plansync.RestController;

import lombok.RequiredArgsConstructor;
import org.example.plansync.Entities.ChannelMessage;
import org.example.plansync.Entities.ChatMessageRequest;
import org.example.plansync.Services.IChannelService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class ChannelWebSocketController {

    private final IChannelService iChannelService;

    @MessageMapping("/channels/{channelId}/send")
    @SendTo("/topic/channels/{channelId}")
    public ChannelMessage handleMessage(
            @DestinationVariable Long channelId,
            ChatMessageRequest request) {
        return iChannelService.sendMessage(channelId, request.getSenderUsername(), request.getContent());
    }
}
