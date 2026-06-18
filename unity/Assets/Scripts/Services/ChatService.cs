using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Aetheria.Core;
using Aetheria.Models;

namespace Aetheria.Services
{
    public class ChatService
    {
        private readonly ApiClient _api;
        private readonly ApiConfig _cfg;

        public event Action<ChatMessageDto> OnMessage;

        public ChatService(ApiClient api, ApiConfig cfg) { _api = api; _cfg = cfg; }

        public Task<ChatMessageDto> Send(string channel, string body, string recipientDisplayName = null) =>
            _api.Post<ChatMessageDto>("/chat/send", new { channel, body, recipientDisplayName });

        public Task<List<ChatMessageDto>> Global(string before = null) =>
            _api.Get<List<ChatMessageDto>>("/chat/global" + (before == null ? "" : $"?before={Uri.EscapeDataString(before)}"));

        public Task<List<ChatMessageDto>> Guild(string guildId, string before = null) =>
            _api.Get<List<ChatMessageDto>>($"/chat/guild/{guildId}" + (before == null ? "" : $"?before={Uri.EscapeDataString(before)}"));

        public Task<List<ChatMessageDto>> Dm(string otherDisplayName, string before = null) =>
            _api.Get<List<ChatMessageDto>>($"/chat/dm/{otherDisplayName}" + (before == null ? "" : $"?before={Uri.EscapeDataString(before)}"));

        // TODO: socket.io connection via a plugin (BestHTTP/2 or socket.io-client-csharp).
        // The intent shape (OnMessage event) is wired here so the UI layer is stable.
        public void ConnectSocket(string accessToken, string guildId = null)
        {
            // Implementation deferred — uses _cfg.wsBaseUrl + "/ws/chat" with handshake.auth.token.
        }

        public void DisconnectSocket() { }
    }
}
