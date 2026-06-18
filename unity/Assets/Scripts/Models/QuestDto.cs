using System;
using System.Collections.Generic;

namespace Aetheria.Models
{
    [Serializable]
    public class QuestDto
    {
        public string id;
        public string name;
        public string description;
        public string kind;     // kill | gather | explore | deliver
        public string cadence;  // one_time | daily | weekly | seasonal
        public string region_id;
        public int level_req;
        public QuestRequirementsDto requirements;
        public QuestRewardsDto rewards;
    }

    [Serializable]
    public class QuestRequirementsDto
    {
        public string target_type; // enemy | item | region
        public string target_id;
        public int count;
    }

    [Serializable]
    public class QuestRewardsDto
    {
        public int gold;
        public int xp;
        public List<QuestRewardItemDto> items;
    }

    [Serializable]
    public class QuestRewardItemDto
    {
        public string item_id;
        public int qty;
    }

    [Serializable]
    public class QuestProgressDto
    {
        public string id;
        public string character_id;
        public string quest_id;
        public string status;
        public QuestProgressCounterDto progress;
        public string accepted_at;
        public string completed_at;
    }

    [Serializable]
    public class QuestProgressCounterDto
    {
        public int count;
    }
}
