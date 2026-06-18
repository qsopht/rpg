using System.Threading.Tasks;
using Aetheria.Core;
using Aetheria.Services;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

namespace Aetheria.Views
{
    [RequireComponent(typeof(UIDocument))]
    public class LoginScreen : MonoBehaviour
    {
        private AuthService _auth;
        private VisualElement _root;
        private TextField _email;
        private TextField _password;
        private TextField _displayName;
        private Toggle _registerMode;
        private Button _submit;
        private Label _error;

        private void OnEnable()
        {
            _auth = ServiceLocator.Get<AuthService>();
            _root = GetComponent<UIDocument>().rootVisualElement;
            _email       = _root.Q<TextField>("email");
            _password    = _root.Q<TextField>("password");
            _displayName = _root.Q<TextField>("displayName");
            _registerMode = _root.Q<Toggle>("registerMode");
            _submit      = _root.Q<Button>("submit");
            _error       = _root.Q<Label>("error");

            _password.isPasswordField = true;
            _displayName.style.display = DisplayStyle.None;

            _registerMode.RegisterValueChangedCallback(evt =>
            {
                _displayName.style.display = evt.newValue ? DisplayStyle.Flex : DisplayStyle.None;
                _submit.text = evt.newValue ? "Register" : "Sign in";
            });

            _submit.clicked += async () =>
            {
                _error.text = string.Empty;
                _submit.SetEnabled(false);
                try
                {
                    if (_registerMode.value)
                        await _auth.Register(_email.value.Trim(), _password.value, _displayName.value.Trim());
                    else
                        await _auth.SignIn(_email.value.Trim(), _password.value);
                    await SceneManager.LoadSceneAsync("Main");
                }
                catch (ApiException ex)
                {
                    _error.text = $"{ex.Code}: {ex.Message}";
                }
                finally { _submit.SetEnabled(true); }
            };
        }
    }
}
