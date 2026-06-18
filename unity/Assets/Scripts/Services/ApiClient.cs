using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Aetheria.Core;
using Newtonsoft.Json;
using UnityEngine;
using UnityEngine.Networking;

namespace Aetheria.Services
{
    public class ApiException : Exception
    {
        public long StatusCode { get; }
        public string Code { get; }
        public ApiException(long status, string code, string message) : base(message)
        {
            StatusCode = status; Code = code;
        }
    }

    /// <summary>
    /// Bearer-aware HTTP client with auto-refresh on 401.
    /// Single in-flight refresh — concurrent 401s wait on the same Task.
    /// </summary>
    public class ApiClient
    {
        private readonly ApiConfig _cfg;
        private readonly TokenStorage _storage;
        private Task<bool> _refreshInFlight;
        private readonly object _refreshLock = new();
        private readonly int _maxRetries = 2;

        public ApiClient(ApiConfig cfg, TokenStorage storage)
        {
            _cfg = cfg;
            _storage = storage;
        }

        public Task<T> Get<T>(string path, CancellationToken ct = default) =>
            Send<T>(UnityWebRequest.kHttpVerbGET, path, null, ct);

        public Task<T> Post<T>(string path, object body, CancellationToken ct = default) =>
            Send<T>(UnityWebRequest.kHttpVerbPOST, path, body, ct);

        public Task<T> Put<T>(string path, object body, CancellationToken ct = default) =>
            Send<T>(UnityWebRequest.kHttpVerbPUT, path, body, ct);

        public Task<T> Patch<T>(string path, object body, CancellationToken ct = default) =>
            Send<T>("PATCH", path, body, ct);

        public Task Delete(string path, CancellationToken ct = default) =>
            Send<object>(UnityWebRequest.kHttpVerbDELETE, path, null, ct);

        private async Task<T> Send<T>(string method, string path, object body, CancellationToken ct)
        {
            for (int attempt = 0; attempt <= _maxRetries; attempt++)
            {
                using var req = new UnityWebRequest(_cfg.apiBaseUrl + path, method);
                req.downloadHandler = new DownloadHandlerBuffer();
                if (body != null)
                {
                    var json = JsonConvert.SerializeObject(body);
                    var bytes = Encoding.UTF8.GetBytes(json);
                    req.uploadHandler = new UploadHandlerRaw(bytes) { contentType = "application/json" };
                }
                req.SetRequestHeader("Accept", "application/json");
                if (!string.IsNullOrEmpty(_storage.AccessToken))
                    req.SetRequestHeader("Authorization", "Bearer " + _storage.AccessToken);

                var op = req.SendWebRequest();
                while (!op.isDone)
                {
                    if (ct.IsCancellationRequested)
                    {
                        req.Abort();
                        throw new OperationCanceledException();
                    }
                    await Task.Yield();
                }

                if (req.result == UnityWebRequest.Result.ConnectionError && attempt < _maxRetries)
                {
                    await Task.Delay(200 * (attempt + 1), ct);
                    continue;
                }

                long status = req.responseCode;
                string text = req.downloadHandler != null ? req.downloadHandler.text : null;

                if (status == 401 && !string.IsNullOrEmpty(_storage.RefreshToken) && attempt < _maxRetries)
                {
                    var ok = await EnsureRefresh();
                    if (ok) continue;
                }

                if (status >= 200 && status < 300)
                {
                    if (typeof(T) == typeof(object) || string.IsNullOrEmpty(text)) return default;
                    return JsonConvert.DeserializeObject<T>(text);
                }

                ApiErrorEnvelope err = null;
                try { err = JsonConvert.DeserializeObject<ApiErrorEnvelope>(text); } catch { }
                throw new ApiException(status, err?.error?.code ?? "unknown", err?.error?.message ?? text);
            }
            throw new ApiException(0, "max_retries", "Exceeded retries");
        }

        private Task<bool> EnsureRefresh()
        {
            lock (_refreshLock)
            {
                if (_refreshInFlight != null) return _refreshInFlight;
                _refreshInFlight = DoRefresh();
                _refreshInFlight.ContinueWith(_ =>
                {
                    lock (_refreshLock) _refreshInFlight = null;
                });
                return _refreshInFlight;
            }
        }

        private async Task<bool> DoRefresh()
        {
            try
            {
                using var req = new UnityWebRequest(_cfg.apiBaseUrl + "/auth/refresh", UnityWebRequest.kHttpVerbPOST);
                req.downloadHandler = new DownloadHandlerBuffer();
                var body = JsonConvert.SerializeObject(new { refreshToken = _storage.RefreshToken });
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body)) { contentType = "application/json" };
                req.SetRequestHeader("Accept", "application/json");
                var op = req.SendWebRequest();
                while (!op.isDone) await Task.Yield();
                if (req.responseCode != 200) { _storage.Clear(); return false; }
                var auth = JsonConvert.DeserializeObject<AuthResult>(req.downloadHandler.text);
                _storage.Save(auth.accessToken, auth.refreshToken, auth.user.id, auth.user.displayName);
                return true;
            }
            catch
            {
                _storage.Clear();
                return false;
            }
        }

        [Serializable] private class ApiErrorEnvelope { public ApiErrorBody error; }
        [Serializable] private class ApiErrorBody { public string code; public string message; public string requestId; }
    }

    [Serializable]
    public class AuthResult
    {
        public string accessToken;
        public string refreshToken;
        public AuthUser user;
    }

    [Serializable]
    public class AuthUser
    {
        public string id;
        public string email;
        public string displayName;
    }
}
