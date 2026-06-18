using UnityEngine;

namespace Aetheria.Services
{
    /// <summary>
    /// MVP token storage. PlayerPrefs is NOT a secure store — for shipping, swap for
    /// a platform-specific keystore plugin (Android EncryptedSharedPreferences, iOS Keychain).
    /// </summary>
    public class TokenStorage
    {
        private const string KAccess = "aetheria.access";
        private const string KRefresh = "aetheria.refresh";
        private const string KDisplayName = "aetheria.displayName";
        private const string KUserId = "aetheria.userId";

        public string AccessToken { get; private set; }
        public string RefreshToken { get; private set; }
        public string DisplayName { get; private set; }
        public string UserId { get; private set; }

        public TokenStorage()
        {
            AccessToken = PlayerPrefs.GetString(KAccess, null);
            RefreshToken = PlayerPrefs.GetString(KRefresh, null);
            DisplayName = PlayerPrefs.GetString(KDisplayName, null);
            UserId = PlayerPrefs.GetString(KUserId, null);
        }

        public void Save(string accessToken, string refreshToken, string userId, string displayName)
        {
            AccessToken = accessToken;
            RefreshToken = refreshToken;
            UserId = userId;
            DisplayName = displayName;
            PlayerPrefs.SetString(KAccess, accessToken ?? string.Empty);
            PlayerPrefs.SetString(KRefresh, refreshToken ?? string.Empty);
            PlayerPrefs.SetString(KUserId, userId ?? string.Empty);
            PlayerPrefs.SetString(KDisplayName, displayName ?? string.Empty);
            PlayerPrefs.Save();
        }

        public void Clear()
        {
            AccessToken = RefreshToken = UserId = DisplayName = null;
            PlayerPrefs.DeleteKey(KAccess);
            PlayerPrefs.DeleteKey(KRefresh);
            PlayerPrefs.DeleteKey(KUserId);
            PlayerPrefs.DeleteKey(KDisplayName);
            PlayerPrefs.Save();
        }

        public bool HasRefresh => !string.IsNullOrEmpty(RefreshToken);
    }
}
