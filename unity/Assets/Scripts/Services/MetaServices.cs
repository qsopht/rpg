using System.Collections.Generic;
using System.Threading.Tasks;
using Aetheria.Models;

namespace Aetheria.Services
{
    public class WorldEventsService
    {
        private readonly ApiClient _api;
        public WorldEventsService(ApiClient api) { _api = api; }
        public Task<List<WorldEventDto>> Current() => _api.Get<List<WorldEventDto>>("/events/current");
    }

    public class LeaderboardsService
    {
        private readonly ApiClient _api;
        public LeaderboardsService(ApiClient api) { _api = api; }

        public Task<List<LeaderboardEntryDto>> Top(string board, int limit = 50) =>
            _api.Get<List<LeaderboardEntryDto>>($"/leaderboards/{board}?limit={limit}");
    }

    public class MarketplaceService
    {
        private readonly ApiClient _api;
        public MarketplaceService(ApiClient api) { _api = api; }

        public Task<List<MarketplaceListingDto>> Search(string itemId = null, int? maxPrice = null)
        {
            var qs = new List<string>();
            if (!string.IsNullOrEmpty(itemId)) qs.Add($"itemId={itemId}");
            if (maxPrice.HasValue) qs.Add($"maxPrice={maxPrice.Value}");
            var path = "/marketplace" + (qs.Count == 0 ? "" : "?" + string.Join("&", qs));
            return _api.Get<List<MarketplaceListingDto>>(path);
        }

        public Task<MarketplaceListingDto> List(string inventoryItemId, int quantity, int priceGold) =>
            _api.Post<MarketplaceListingDto>("/marketplace/list", new { inventoryItemId, quantity, priceGold });

        public Task<object> Buy(string listingId) =>
            _api.Post<object>($"/marketplace/{listingId}/buy", new {});

        public Task<object> Cancel(string listingId) =>
            _api.Post<object>($"/marketplace/{listingId}/cancel", new {});
    }

    public class NotificationsService
    {
        private readonly ApiClient _api;
        public NotificationsService(ApiClient api) { _api = api; }

        public Task<List<NotificationDto>> List(bool unreadOnly = false) =>
            _api.Get<List<NotificationDto>>($"/notifications?unreadOnly={(unreadOnly ? "true" : "false")}");

        public Task<object> Ack(string id) => _api.Post<object>($"/notifications/{id}/ack", new {});
    }
}
