using Aetheria.Core;
using Aetheria.Models;
using Aetheria.Services;
using UnityEngine;
using UnityEngine.UIElements;

namespace Aetheria.Views
{
    [RequireComponent(typeof(UIDocument))]
    public class ProfileScreen : MonoBehaviour
    {
        private VisualElement _root;
        private Label _name, _gold, _gems, _bio;

        private async void OnEnable()
        {
            _root = GetComponent<UIDocument>().rootVisualElement;
            _name = _root.Q<Label>("name");
            _gold = _root.Q<Label>("gold");
            _gems = _root.Q<Label>("gems");
            _bio  = _root.Q<Label>("bio");

            try
            {
                var me = await ServiceLocator.Get<ApiClient>().Get<PlayerDto>("/players/me");
                _name.text = me.displayName;
                _gold.text = "Gold: " + me.gold;
                _gems.text = "Gems: " + me.gems;
                _bio.text  = me.bio ?? "";
            }
            catch (ApiException ex) { _name.text = $"err: {ex.Code}"; }
        }
    }
}
