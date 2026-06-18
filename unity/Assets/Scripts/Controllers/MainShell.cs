using System.Linq;
using System.Threading.Tasks;
using Aetheria.Core;
using Aetheria.Models;
using Aetheria.Services;
using Aetheria.Views;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

namespace Aetheria.Controllers
{
    /// <summary>
    /// Sits on a single GameObject in Main.unity, wires the tabbed shell:
    ///   World · Quests · Inventory · Leaderboard · Profile
    /// Each tab is a UIDocument prefab that gets instantiated when selected.
    /// </summary>
    [RequireComponent(typeof(UIDocument))]
    public class MainShell : MonoBehaviour
    {
        [SerializeField] private GameObject worldScreenPrefab;
        [SerializeField] private GameObject questScreenPrefab;
        [SerializeField] private GameObject inventoryScreenPrefab;
        [SerializeField] private GameObject leaderboardScreenPrefab;
        [SerializeField] private GameObject combatScreenPrefab;
        [SerializeField] private GameObject characterCreatePrefab;

        private VisualElement _root;
        private VisualElement _tabContent;
        private GameObject _activeChild;
        private string _activeCharacterId;

        private async void OnEnable()
        {
            _root = GetComponent<UIDocument>().rootVisualElement;
            _tabContent = _root.Q<VisualElement>("tabContent");

            _root.Q<Button>("tab-world").clicked      += () => ShowWorld();
            _root.Q<Button>("tab-quests").clicked     += () => SwapTo(questScreenPrefab, "quests");
            _root.Q<Button>("tab-inventory").clicked  += () => SwapTo(inventoryScreenPrefab, "inventory");
            _root.Q<Button>("tab-leaderboard").clicked+= () => SwapTo(leaderboardScreenPrefab, "leaderboard");
            _root.Q<Button>("signout").clicked        += async () =>
            {
                await ServiceLocator.Get<AuthService>().SignOut();
                await SceneManager.LoadSceneAsync("Login");
            };

            await EnsureCharacter();
            ShowWorld();
        }

        private async Task EnsureCharacter()
        {
            var svc = ServiceLocator.Get<CharacterService>();
            var list = await svc.List();
            if (list.Count == 0)
            {
                var creator = Instantiate(characterCreatePrefab, _tabContent);
                creator.GetComponent<CharacterCreateScreen>().OnCompleted += async () =>
                {
                    Destroy(creator);
                    var newList = await svc.List();
                    _activeCharacterId = newList[0].id;
                    ShowWorld();
                };
                return;
            }
            _activeCharacterId = list[0].id;
        }

        private void ShowWorld()
        {
            if (_activeCharacterId == null) return;
            DestroyActive();
            _activeChild = Instantiate(worldScreenPrefab, _tabContent);
            var ws = _activeChild.GetComponent<WorldScreen>();
            ws.CharacterId = _activeCharacterId;
            ws.OnEncounterStarted += StartCombat;
        }

        private void SwapTo(GameObject prefab, string kind)
        {
            if (_activeCharacterId == null) return;
            DestroyActive();
            _activeChild = Instantiate(prefab, _tabContent);
            switch (kind)
            {
                case "quests":    _activeChild.GetComponent<QuestJournalScreen>().CharacterId = _activeCharacterId; break;
                case "inventory": _activeChild.GetComponent<InventoryScreen>().CharacterId = _activeCharacterId; break;
                case "leaderboard": break;
            }
        }

        private void StartCombat(EncounterStartedDto enc)
        {
            DestroyActive();
            _activeChild = Instantiate(combatScreenPrefab, _tabContent);
            var cs = _activeChild.GetComponent<CombatScreen>();
            cs.Encounter = enc;
            cs.OnEnded += (status, rewards) =>
            {
                Debug.Log($"Combat ended: {status}");
                ShowWorld();
            };
        }

        private void DestroyActive()
        {
            if (_activeChild != null) Destroy(_activeChild);
            _activeChild = null;
        }
    }
}
