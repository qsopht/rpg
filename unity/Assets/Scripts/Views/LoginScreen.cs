using System;
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
        private const string DeepLink = "aetheria://oauth-callback";

        private AuthService _auth;
        private ApiConfig _cfg;
        private VisualElement _root;
        private TextField _email;
        private TextField _password;
        private TextField _displayName;
        private Toggle _registerMode;
        private Button _submit;
        private Button _googleSignIn;
        private Label _error;

        private void OnEnable()
        {
            _auth = ServiceLocator.Get<AuthService>();
            _cfg  = ServiceLocator.Get<ApiConfig>();
            _root = GetComponent<UIDocument>().rootVisualElement;
            _email        = _root.Q<TextField>("email");
            _password     = _root.Q<TextField>("password");
            _displayName  = _root.Q<TextField>("displayName");
            _registerMode = _root.Q<Toggle>("registerMode");
            _submit       = _root.Q<Button>("submit");
            _googleSignIn = _root.Q<Button>("googleSignIn");
            _error        = _root.Q<Label>("error");

            _password.isPasswordField = true;
            _displayName.style.display = DisplayStyle.None;

            _registerMode.RegisterValueChangedCallback(evt =>
            {
                _displayName.style.display = evt.newValue ? DisplayStyle.Flex : DisplayStyle.None;
                _submit.text = evt.newValue ? "Register" : "Sign in";
            });

            _submit.clicked += OnSubmit;
            _googleSignIn.clicked += OnGoogleSignIn;
        }

        private async void OnSubmit()
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
        }

        private void OnGoogleSignIn()
        {
            _error.text = string.Empty;
            // Backend builds the Google OAuth URL, redirects through it, and on success
            // 302s back to our `aetheria://oauth-callback` deep link with the JWT pair.
            // DeepLinkHandler picks it up, saves tokens, navigates to Main.
            var url =
                $"{_cfg.apiBaseUrl}/auth/google/start?redirectUri={Uri.EscapeDataString(DeepLink)}";
#if UNITY_EDITOR
            _error.text =
                "Google Sign-In requires a real device — deep links can't return to the Editor. " +
                "Test with email/password here.";
            Debug.Log($"[Login] would have opened: {url}");
            return;
#else
            Application.OpenURL(url);
#endif
        }
    }
}
