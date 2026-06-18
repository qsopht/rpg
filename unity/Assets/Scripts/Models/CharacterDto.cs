using System;
using System.Collections.Generic;

namespace Aetheria.Models
{
    [Serializable]
    public class CharacterDto
    {
        public string id;
        public string name;
        public string @class; // "warrior" | "ranger" | "mage"
        public int level;
        public long xp;
        public long xpToNext;
        public int skillPoints;
        public StatsDto stats;
        public Dictionary<string, string> equipment;
        public string currentRegionId;
    }

    [Serializable]
    public class StatsDto
    {
        public int health;
        public int attack;
        public int defense;
        public int agility;
        public int magic;
    }
}
