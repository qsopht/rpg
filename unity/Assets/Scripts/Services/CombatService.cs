using System.Collections.Generic;
using System.Threading.Tasks;
using Aetheria.Models;

namespace Aetheria.Services
{
    public class CombatService
    {
        private readonly ApiClient _api;
        public CombatService(ApiClient api) { _api = api; }

        public Task<EncounterStartedDto> Start(string characterId, string regionId) =>
            _api.Post<EncounterStartedDto>("/combat/start", new { characterId, regionId });

        public Task<CombatActionResultDto> Attack(string encounterId) =>
            _api.Post<CombatActionResultDto>($"/combat/{encounterId}/action", new { action = "attack" });

        public Task<CombatActionResultDto> Skill(string encounterId, string skillId) =>
            _api.Post<CombatActionResultDto>($"/combat/{encounterId}/action", new { action = "skill", skillId });

        public Task<CombatActionResultDto> Defend(string encounterId) =>
            _api.Post<CombatActionResultDto>($"/combat/{encounterId}/action", new { action = "defend" });

        public Task<CombatActionResultDto> UseItem(string encounterId, string itemId) =>
            _api.Post<CombatActionResultDto>($"/combat/{encounterId}/action", new { action = "use_item", itemId });

        public Task<CombatActionResultDto> Flee(string encounterId) =>
            _api.Post<CombatActionResultDto>($"/combat/{encounterId}/action", new { action = "flee" });
    }
}
