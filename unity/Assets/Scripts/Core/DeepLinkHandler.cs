using System;
using System.Collections.Generic;
using Aetheria.Services;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Aetheria.Core
{
    /// <summary>
    /// Receives `aetheria://oauth-callback?accessToken=...&refreshToken=...&userId=...&displayName=...`
    /// deep links from the OS (Android intent-filter / iOS URL scheme), pulls tokens out, persists
    /// them via TokenStorage, and navigates to Main.
    ///
    /// Lives across scenes (DontDestroyOnLoad) so the OS can wake the app via deep link from
    /// any state — cold start, foregrounded, mid-scene-change.
    /// </summary>
    public class DeepLinkHandler : MonoBehaviour
    {
        private const string Scheme = "aetheria://";
        private const string CallbackHost = "oauth-callback";

        private void Awake()
        {
            Application.deepLinkActivated += Handle;

            // Cold start: app was launched by the deep link itself.
            if (!string.IsNullOrEmpty(Application.absoluteURL))
                Handle(Application.absoluteURL);
        }

        private void OnDestroy()
        {
            Application.deepLinkActivated -= Handle;
        }

        private async void Handle(string url)
        {
            try
            {
                if (string.IsNullOrEmpty(url) || !url.StartsWith(Scheme))
                {
                    Debug.Log($"[DeepLink] ignored: {url}");
                    return;
                }
                var uri = new Uri(url);
                if (uri.Host != CallbackHost)
                {
                    Debug.LogWarning($"[DeepLink] unknown host: {uri.Host}");
                    return;
                }

                var query = ParseQuery(uri.Query);
                if (!query.TryGetValue("accessToken", out var at) ||
                    !query.TryGetValue("refreshToken", out var rt) ||
                    !query.TryGetValue("userId", out var userId) ||
                    !query.TryGetValue("displayName", out var displayName))
                {
                    Debug.LogError("[DeepLink] callback missing required params");
                    return;
                }

                var storage = ServiceLocator.GetOrNull<TokenStorage>();
                if (storage == null)
                {
                    Debug.LogError("[DeepLink] TokenStorage not registered (Bootstrap not run?)");
                    return;
                }
                storage.Save(at, rt, userId, displayName);
                Debug.Log("[DeepLink] tokens saved, navigating to Main");
                await SceneManager.LoadSceneAsync("Main");
            }
            catch (Exception e)
            {
                Debug.LogError($"[DeepLink] failed: {e}");
            }
        }

        private static Dictionary<string, string> ParseQuery(string query)
        {
            var result = new Dictionary<string, string>();
            if (string.IsNullOrEmpty(query)) return result;
            var trimmed = query.StartsWith("?") ? query.Substring(1) : query;
            foreach (var pair in trimmed.Split('&'))
            {
                if (string.IsNullOrEmpty(pair)) continue;
                var eq = pair.IndexOf('=');
                if (eq < 0) { result[pair] = string.Empty; continue; }
                var key = Uri.UnescapeDataString(pair.Substring(0, eq));
                var val = Uri.UnescapeDataString(pair.Substring(eq + 1));
                result[key] = val;
            }
            return result;
        }
    }
}
