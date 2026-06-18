using System;
using System.Collections.Generic;

namespace Aetheria.Models
{
    [Serializable]
    public class RegionDto
    {
        public string id;
        public string name;
        public string description;
        public int level_min;
        public int level_max;
        public List<RegionEnemyEntry> enemy_pool;
    }

    [Serializable]
    public class RegionEnemyEntry
    {
        public string enemy_id;
        public int weight;
    }
}
