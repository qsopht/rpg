using System.Threading.Tasks;
using Aetheria.Models;

namespace Aetheria.Services
{
    public class AuthService
    {
        private readonly ApiClient _api;
        private readonly TokenStorage _storage;

        public AuthService(ApiClient api, TokenStorage storage) { _api = api; _storage = storage; }

        public bool IsSignedIn => !string.IsNullOrEmpty(_storage.AccessToken);
        public string DisplayName => _storage.DisplayName;
        public string UserId => _storage.UserId;

        public async Task<bool> TryRestoreSession()
        {
            if (!_storage.HasRefresh) return false;
            try
            {
                var me = await _api.Get<PlayerDto>("/players/me");
                return me != null;
            }
            catch
            {
                _storage.Clear();
                return false;
            }
        }

        public async Task SignIn(string email, string password)
        {
            var result = await _api.Post<AuthResult>("/auth/login",
                new { email, password });
            _storage.Save(result.accessToken, result.refreshToken, result.user.id, result.user.displayName);
        }

        public async Task Register(string email, string password, string displayName)
        {
            var result = await _api.Post<AuthResult>("/auth/register",
                new { email, password, displayName });
            _storage.Save(result.accessToken, result.refreshToken, result.user.id, result.user.displayName);
        }

        public async Task SignInWithGoogle(string idToken)
        {
            var result = await _api.Post<AuthResult>("/auth/google", new { idToken });
            _storage.Save(result.accessToken, result.refreshToken, result.user.id, result.user.displayName);
        }

        public async Task SignOut()
        {
            try { await _api.Post<object>("/auth/logout", new {}); } catch { /* best effort */ }
            _storage.Clear();
        }
    }
}
