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
    public class QuestJournalScreen : MonoBehaviour
    {
        public string CharacterId;

        private QuestService _quests;
        private VisualElement _root;
        private ListView _activeList, _availableList;
        private List<QuestProgressDto> _active = new();
        private List<QuestDto> _available = new();

        private async void OnEnable()
        {
            _quests = ServiceLocator.Get<QuestService>();
            _root = GetComponent<UIDocument>().rootVisualElement;
            _activeList = _root.Q<ListView>("active");
            _availableList = _root.Q<ListView>("available");
            await Refresh();
        }

        private async Task Refresh()
        {
            try
            {
                _active = await _quests.Active(CharacterId);
                _available = await _quests.Available(CharacterId);

                _activeList.itemsSource = _active;
                _activeList.makeItem = MakeActiveItem;
                _activeList.bindItem = BindActiveItem;
                _activeList.Rebuild();

                _availableList.itemsSource = _available;
                _availableList.makeItem = MakeAvailableItem;
                _availableList.bindItem = BindAvailableItem;
                _availableList.Rebuild();
            }
            catch (ApiException ex) { Debug.LogError($"quests: {ex.Code} {ex.Message}"); }
        }

        private VisualElement MakeActiveItem()
        {
            var row = new VisualElement { style = { paddingTop = 6, paddingBottom = 6 } };
            row.Add(new Label { name = "status" });
            row.Add(new Label { name = "title" });
            row.Add(new Button { name = "action", text = "Turn in" });
            return row;
        }
        private void BindActiveItem(VisualElement e, int i)
        {
            var p = _active[i];
            e.Q<Label>("title").text = $"Quest {p.quest_id} — {p.progress.count}";
            e.Q<Label>("status").text = p.status;
            var btn = e.Q<Button>("action");
            btn.SetEnabled(p.status == "ready_to_turn_in");
            btn.clickable = new Clickable(async () =>
            {
                try { await _quests.TurnIn(CharacterId, p.quest_id); await Refresh(); }
                catch (ApiException ex) { Debug.LogWarning(ex.Message); }
            });
        }

        private VisualElement MakeAvailableItem()
        {
            var row = new VisualElement { style = { paddingTop = 6, paddingBottom = 6 } };
            row.Add(new Label { name = "title", style = { fontSize = 16 } });
            row.Add(new Label { name = "desc", style = { opacity = 0.8f } });
            row.Add(new Button { name = "accept", text = "Accept" });
            return row;
        }
        private void BindAvailableItem(VisualElement e, int i)
        {
            var q = _available[i];
            e.Q<Label>("title").text = q.name;
            e.Q<Label>("desc").text = q.description;
            var btn = e.Q<Button>("accept");
            btn.clickable = new Clickable(async () =>
            {
                try { await _quests.Accept(CharacterId, q.id); await Refresh(); }
                catch (ApiException ex) { Debug.LogWarning(ex.Message); }
            });
        }
    }
}
