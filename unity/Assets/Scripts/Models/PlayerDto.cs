using System;

namespace Aetheria.Models
{
    [Serializable]
    public class PlayerDto
    {
        public string id;
        public string displayName;
        public string avatarId;
        public string bio;
        public int gold;
        public int gems;
        public string lastSeenAt;
    }
}
