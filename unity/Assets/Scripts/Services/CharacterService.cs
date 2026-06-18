using System.Collections.Generic;
using System.Threading.Tasks;
using Aetheria.Models;

namespace Aetheria.Services
{
    public class CharacterService
    {
        private readonly ApiClient _api;
        public CharacterService(ApiClient api) { _api = api; }

        public Task<List<CharacterDto>> List() =>
            _api.Get<List<CharacterDto>>("/characters");

        public Task<CharacterDto> Get(string id) =>
            _api.Get<CharacterDto>($"/characters/{id}");

        public Task<CharacterDto> Create(string name, string charClass) =>
            _api.Post<CharacterDto>("/characters", new { name, @class = charClass });

        public Task<CharacterDto> EnterRegion(string characterId, string regionId) =>
            _api.Put<CharacterDto>($"/characters/{characterId}/region", new { regionId });
    }
}
