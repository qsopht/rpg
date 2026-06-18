using System.Threading.Tasks;
using Aetheria.Core;
using Aetheria.Services;
using UnityEngine;
using UnityEngine.UIElements;

namespace Aetheria.Views
{
    [RequireComponent(typeof(UIDocument))]
    public class CharacterCreateScreen : MonoBehaviour
    {
        public delegate void Completed();
        public event Completed OnCompleted;

        private CharacterService _characters;
        private VisualElement _root;
        private TextField _name;
        private DropdownField _class;
        private Button _create;
        private Label _error;

        private void OnEnable()
        {
            _characters = ServiceLocator.Get<CharacterService>();
            _root = GetComponent<UIDocument>().rootVisualElement;
            _name = _root.Q<TextField>("name");
            _class = _root.Q<DropdownField>("class");
            _create = _root.Q<Button>("create");
            _error = _root.Q<Label>("error");

            _class.choices = new() { "warrior", "ranger", "mage" };
            _class.value = "warrior";

            _create.clicked += async () =>
            {
                _error.text = string.Empty;
                _create.SetEnabled(false);
                try
                {
                    await _characters.Create(_name.value.Trim(), _class.value);
                    OnCompleted?.Invoke();
                }
                catch (ApiException ex)
                {
                    _error.text = $"{ex.Code}: {ex.Message}";
                }
                finally { _create.SetEnabled(true); }
            };
        }
    }
}
