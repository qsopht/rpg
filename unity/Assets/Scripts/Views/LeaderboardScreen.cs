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
    public class LeaderboardScreen : MonoBehaviour
    {
        private LeaderboardsService _lb;
        private VisualElement _root;
        private ListView _list;
        private List<LeaderboardEntryDto> _entries = new();

        private async void OnEnable()
        {
            _lb = ServiceLocator.Get<LeaderboardsService>();
            _root = GetComponent<UIDocument>().rootVisualElement;
            _list = _root.Q<ListView>("entries");

            try
            {
                _entries = await _lb.Top("xp_total");
                _list.itemsSource = _entries;
                _list.makeItem = () =>
                {
                    var row = new VisualElement { style = { flexDirection = FlexDirection.Row, paddingTop = 4, paddingBottom = 4 } };
                    row.Add(new Label { name = "rank", style = { width = 40 } });
                    row.Add(new Label { name = "name", style = { flexGrow = 1 } });
                    row.Add(new Label { name = "score", style = { width = 80 } });
                    return row;
                };
                _list.bindItem = (e, i) =>
                {
                    var x = _entries[i];
                    e.Q<Label>("rank").text = "#" + x.rank;
                    e.Q<Label>("name").text = $"{x.characterName} ({x.playerName})";
                    e.Q<Label>("score").text = ((int)x.score).ToString();
                };
                _list.Rebuild();
            }
            catch (ApiException ex) { Debug.LogError($"lb: {ex.Code}"); }
        }
    }
}
