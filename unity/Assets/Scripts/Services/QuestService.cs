using System.Collections.Generic;
using System.Threading.Tasks;
using Aetheria.Models;

namespace Aetheria.Services
{
    public class QuestService
    {
        private readonly ApiClient _api;
        public QuestService(ApiClient api) { _api = api; }

        public Task<List<QuestDto>> Available(string characterId) =>
            _api.Get<List<QuestDto>>($"/characters/{characterId}/quests/available");

        public Task<List<QuestProgressDto>> Active(string characterId) =>
            _api.Get<List<QuestProgressDto>>($"/characters/{characterId}/quests/active");

        public Task<QuestProgressDto> Accept(string characterId, string questId) =>
            _api.Post<QuestProgressDto>($"/characters/{characterId}/quests/accept", new { questId });

        public Task<object> Abandon(string characterId, string questId) =>
            _api.Post<object>($"/characters/{characterId}/quests/abandon", new { questId });

        public Task<object> TurnIn(string characterId, string questId) =>
            _api.Post<object>($"/characters/{characterId}/quests/turn-in", new { questId });
    }
}
