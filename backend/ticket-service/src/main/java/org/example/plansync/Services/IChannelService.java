package org.example.plansync.Services;

import org.example.plansync.Entities.Channel;
import org.example.plansync.Entities.ChannelMessage;
import org.example.plansync.Entities.Ticket;

import java.util.List;

public interface IChannelService {

    Channel createChannelForTicket(Ticket ticket);

    Channel archiveChannelForTicket(Long ticketId);

    Channel getChannelByTicketId(Long ticketId);

    Channel getChannelById(Long channelId);

    ChannelMessage sendMessage(Long channelId, String senderUsername, String content);

    List<ChannelMessage> getMessageHistory(Long channelId);
}
