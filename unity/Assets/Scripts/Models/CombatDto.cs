using System;
using System.Collections.Generic;

namespace Aetheria.Models
{
    [Serializable]
    public class EncounterStartedDto
    {
        public string encounterId;
        public EncounterEnemyDto enemy;
        public StatsDto player;
        public string regionId;
    }

    [Serializable]
    public class EncounterEnemyDto
    {
        public string id;
        public string name;
        public int level;
        public string archetype;
        public StatsDto stats;
    }

    [Serializable]
    public class CombatActionResultDto
    {
        public string status; // ongoing | victory | defeat | fled
        public string encounterId;
        public CombatStepDto step;
        public CombatStateDto state;
        public CombatRewardsDto rewards;
    }

    [Serializable]
    public class CombatStepDto
    {
        public int round;
        public string playerAction;
        public int playerDamage;
        public string enemyAction;
        public int enemyDamage;
        public int playerHp;
        public int enemyHp;
    }

    [Serializable]
    public class CombatStateDto
    {
        public StatsDto player;
        public StatsDto enemy;
    }

    [Serializable]
    public class CombatRewardsDto
    {
        public int xp;
        public int gold;
        public List<LootDropDto> loot;
    }

    [Serializable]
    public class LootDropDto
    {
        public string item_id;
        public int quantity;
    }
}
