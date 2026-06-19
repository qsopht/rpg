using System.Threading.Tasks;
using Aetheria.Services;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Aetheria.Core
{
    /// <summary>
    /// Sits on a single GameObject in Boot.unity. Wires up services, then transitions to login or main.
    /// </summary>
    public class Bootstrap : MonoBehaviour
    {
        [SerializeField] private string nextSceneWhenSignedIn = "Main";
        [SerializeField] private string nextSceneWhenSignedOut = "Login";

        private async void Start()
        {
            DontDestroyOnLoad(gameObject);
            var cfg = ApiConfig.Load();
            if (cfg == null) return;

            // Persistent OAuth deep-link receiver — survives scene loads.
            var deepLinks = new GameObject(nameof(DeepLinkHandler));
            deepLinks.AddComponent<DeepLinkHandler>();
            DontDestroyOnLoad(deepLinks);

            var storage = new TokenStorage();
            var api = new ApiClient(cfg, storage);
            var auth = new AuthService(api, storage);
            var characters = new CharacterService(api);
            var inventory = new InventoryService(api);
            var quests = new QuestService(api);
            var combat = new CombatService(api);
            var chat = new ChatService(api, cfg);
            var events = new WorldEventsService(api);
            var leaderboards = new LeaderboardsService(api);
            var marketplace = new MarketplaceService(api);

            ServiceLocator.Register(cfg);
            ServiceLocator.Register(storage);
            ServiceLocator.Register(api);
            ServiceLocator.Register(auth);
            ServiceLocator.Register(characters);
            ServiceLocator.Register(inventory);
            ServiceLocator.Register(quests);
            ServiceLocator.Register(combat);
            ServiceLocator.Register(chat);
            ServiceLocator.Register(events);
            ServiceLocator.Register(leaderboards);
            ServiceLocator.Register(marketplace);

            var signedIn = await auth.TryRestoreSession();
            await SceneManager.LoadSceneAsync(signedIn ? nextSceneWhenSignedIn : nextSceneWhenSignedOut);
        }
    }
}
