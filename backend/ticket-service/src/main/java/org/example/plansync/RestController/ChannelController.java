package org.example.plansync.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.plansync.Entities.Channel;
import org.example.plansync.Entities.ChannelMessage;
import org.example.plansync.Entities.ChatMessageRequest;
import org.example.plansync.Services.IChannelService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Channel Management")
@RequestMapping("/api/channel")
public class ChannelController {

    private final IChannelService iChannelService;

    @Operation(description = "Get channel info by ticket id")
    @GetMapping("/byTicket/{ticketId}")
    public Channel getChannelByTicket(@PathVariable Long ticketId) {
        return iChannelService.getChannelByTicketId(ticketId);
    }

    @Operation(description = "Get channel info by channel id")
    @GetMapping("/{channelId}")
    public Channel getChannel(@PathVariable Long channelId) {
        return iChannelService.getChannelById(channelId);
    }

    @Operation(description = "Get full message history for a channel (chronological)")
    @GetMapping("/{channelId}/messages")
    public List<ChannelMessage> getMessages(@PathVariable Long channelId) {
        return iChannelService.getMessageHistory(channelId);
    }

    @Operation(description = "Send a message to a channel via REST")
    @PostMapping("/{channelId}/messages")
    public ResponseEntity<ChannelMessage> sendMessage(
            @PathVariable Long channelId,
            @RequestBody ChatMessageRequest request) {
        return ResponseEntity.ok(iChannelService.sendMessage(channelId, request.getSenderUsername(), request.getContent()));
    }
}
