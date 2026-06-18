using System.Collections.Generic;
using System.Threading.Tasks;
using Aetheria.Core;
using Aetheria.Models;
using Aetheria.Services;
using UnityEngine;
using UnityEngine.UIElements;

namespace Aetheria.Views
{
    [RequireComponent(typeof(UIDocument))]
    public class WorldScreen : MonoBehaviour
    {
        public string CharacterId; // set by controller

        private CharacterService _characters;
        private CombatService _combat;
        private WorldEventsService _events;
        private VisualElement _root;
        private Label _eventsBanner;
        private ListView _regions;
        private List<RegionDto> _regionList = new();

        public delegate void EncounterStartedHandler(EncounterStartedDto enc);
        public event EncounterStartedHandler OnEncounterStarted;

        private async void OnEnable()
        {
            _characters = ServiceLocator.Get<CharacterService>();
            _combat = ServiceLocator.Get<CombatService>();
            _events = ServiceLocator.Get<WorldEventsService>();
            _root = GetComponent<UIDocument>().rootVisualElement;
            _eventsBanner = _root.Q<Label>("eventsBanner");
            _regions = _root.Q<ListView>("regions");

            await RefreshEvents();
            await RefreshRegions();
        }

        private async Task RefreshEvents()
        {
            try
            {
                var ev = await _events.Current();
                if (ev != null && ev.Count > 0)
                {
                    var e = ev[0];
                    _eventsBanner.text = $"WORLD EVENT — {e.name}: {e.progress} / {e.progress_goal}";
                    _eventsBanner.style.display = DisplayStyle.Flex;
                }
                else
                {
                    _eventsBanner.style.display = DisplayStyle.None;
                }
            }
            catch { _eventsBanner.style.display = DisplayStyle.None; }
        }

        private async Task RefreshRegions()
        {
            try
            {
                var api = ServiceLocator.Get<ApiClient>();
                _regionList = await api.Get<List<RegionDto>>("/regions");
                _regions.itemsSource = _regionList;
                _regions.makeItem = () =>
                {
                    var row = new VisualElement();
                    row.style.paddingTop = 6; row.style.paddingBottom = 6;
                    var title = new Label { name = "title" };
                    title.style.fontSize = 18;
                    var desc = new Label { name = "desc" };
                    desc.style.opacity = 0.8f;
                    var fight = new Button { name = "fight", text = "Explore" };
                    row.Add(title); row.Add(desc); row.Add(fight);
                    return row;
                };
                _regions.bindItem = (e, i) =>
                {
                    var r = _regionList[i];
                    e.Q<Label>("title").text = $"{r.name}  (Lv {r.level_min}–{r.level_max})";
                    e.Q<Label>("desc").text = r.description;
                    var btn = e.Q<Button>("fight");
                    btn.clicked -= null;
                    btn.clicked += async () =>
                    {
                        await _characters.EnterRegion(CharacterId, r.id);
                        try
                        {
                            var enc = await _combat.Start(CharacterId, r.id);
                            OnEncounterStarted?.Invoke(enc);
                        }
                        catch (ApiException ex) { Debug.LogWarning($"start failed: {ex.Code}"); }
                    };
                };
                _regions.Rebuild();
            }
            catch (ApiException ex) { Debug.LogError($"regions failed: {ex.Code} {ex.Message}"); }
        }
    }
}
