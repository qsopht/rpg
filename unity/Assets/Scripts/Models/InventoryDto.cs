using System;
using System.Collections.Generic;

namespace Aetheria.Models
{
    [Serializable]
    public class InventoryEntryDto
    {
        public string id;
        public string itemId;
        public string name;
        public string kind;
        public string rarity;
        public string slot;
        public Dictionary<string, float> stats;
        public int quantity;
        public bool isEquipped;
    }
}
