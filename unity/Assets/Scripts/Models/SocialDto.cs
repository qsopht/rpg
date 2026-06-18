using System;
using System.Collections.Generic;

namespace Aetheria.Models
{
    [Serializable]
    public class GuildDto
    {
        public string id;
        public string name;
        public string tag;
        public string description;
        public string owner_player_id;
        public int level;
        public int member_cap;
        public List<GuildMemberDto> members;
    }

    [Serializable]
    public class GuildMemberDto
    {
        public string id;
        public string rank;
        public string player_id;
        public string display_name;
        public string joined_at;
    }

    [Serializable]
    public class ChatMessageDto
    {
        public string id;
        public string channel;
        public string channel_id;
        public string sender_player_id;
        public string body;
        public string sent_at;
    }

    [Serializable]
    public class WorldEventDto
    {
        public string id;
        public string template_id;
        public string name;
        public string description;
        public string status;
        public long progress;
        public long progress_goal;
        public string region_id;
        public string starts_at;
        public string ends_at;
    }

    [Serializable]
    public class LeaderboardEntryDto
    {
        public int rank;
        public string memberId;
        public double score;
        public string characterName;
        public string playerName;
    }

    [Serializable]
    public class NotificationDto
    {
        public string id;
        public string player_id;
        public string kind;
        public Dictionary<string, object> payload;
        public bool read;
        public string created_at;
    }

    [Serializable]
    public class MarketplaceListingDto
    {
        public string id;
        public string seller_player_id;
        public string item_id;
        public int quantity;
        public int price_gold;
        public string status;
        public string expires_at;
    }
}
