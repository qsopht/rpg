using System.Collections.Generic;
using System.Threading.Tasks;
using Aetheria.Models;

namespace Aetheria.Services
{
    public class InventoryService
    {
        private readonly ApiClient _api;
        public InventoryService(ApiClient api) { _api = api; }

        public Task<List<InventoryEntryDto>> List(string characterId) =>
            _api.Get<List<InventoryEntryDto>>($"/characters/{characterId}/inventory");

        public Task<object> Equip(string characterId, string inventoryItemId) =>
            _api.Post<object>($"/characters/{characterId}/inventory/equip", new { inventoryItemId });

        public Task<object> Unequip(string characterId, string slot) =>
            _api.Post<object>($"/characters/{characterId}/inventory/unequip", new { slot });
    }
}
