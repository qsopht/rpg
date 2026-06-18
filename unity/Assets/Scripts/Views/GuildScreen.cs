using System.Threading.Tasks;
using Aetheria.Core;
using Aetheria.Models;
using Aetheria.Services;
using UnityEngine;
using UnityEngine.UIElements;

namespace Aetheria.Views
{
    [RequireComponent(typeof(UIDocument))]
    public class GuildScreen : MonoBehaviour
    {
        private VisualElement _root;
        private Label _name, _tag, _members;

        private async void OnEnable()
        {
            _root = GetComponent<UIDocument>().rootVisualElement;
            _name = _root.Q<Label>("guildName");
            _tag = _root.Q<Label>("guildTag");
            _members = _root.Q<Label>("members");
            await Refresh();
        }

        private async Task Refresh()
        {
            try
            {
                var api = ServiceLocator.Get<ApiClient>();
                var g = await api.Get<GuildDto>("/guilds/me");
                if (g == null)
                {
                    _name.text = "No guild yet.";
                    return;
                }
                _name.text = g.name;
                _tag.text = $"<{g.tag}>";
                _members.text = string.Join("\n", g.members.ConvertAll(m => $"{m.display_name} — {m.rank}"));
            }
            catch (ApiException ex) { _name.text = $"err: {ex.Code}"; }
        }
    }
}
