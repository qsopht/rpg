using UnityEngine;

namespace Aetheria.Core
{
    [CreateAssetMenu(fileName = "ApiConfig", menuName = "Aetheria/ApiConfig")]
    public class ApiConfig : ScriptableObject
    {
        [Header("REST")]
        public string apiBaseUrl = "http://10.0.2.2:3000";

        [Header("WebSocket")]
        public string wsBaseUrl = "ws://10.0.2.2:3000";

        [Header("Google Sign-In")]
        public string googleClientId = string.Empty;

        public static ApiConfig Load()
        {
            var cfg = Resources.Load<ApiConfig>("ApiConfig");
            if (cfg == null) Debug.LogError("ApiConfig.asset missing in Resources/");
            return cfg;
        }
    }
}
