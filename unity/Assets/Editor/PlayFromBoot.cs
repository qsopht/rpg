#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Aetheria.EditorTools
{
    /// <summary>
    /// Makes the Editor's Play button always start at Boot.unity, no matter
    /// which scene you're editing. The original scene is restored when you
    /// exit Play mode.
    ///
    /// Without this, pressing Play in Main.unity skips Bootstrap and you get
    /// "Service X not registered" runtime errors.
    ///
    /// Toggle via the menu: Aetheria → Play From Boot Scene
    /// </summary>
    [InitializeOnLoad]
    internal static class PlayFromBoot
    {
        private const string MenuPath  = "Aetheria/Play From Boot Scene";
        private const string PrefKey   = "Aetheria.PlayFromBoot";
        private const string BootPath  = "Assets/Scenes/Boot.unity";

        static PlayFromBoot()
        {
            EditorApplication.delayCall += Apply;
        }

        private static void Apply()
        {
            var enabled = EditorPrefs.GetBool(PrefKey, true);
            Menu.SetChecked(MenuPath, enabled);

            if (enabled)
            {
                var boot = AssetDatabase.LoadAssetAtPath<SceneAsset>(BootPath);
                if (boot != null)
                    EditorSceneManager.playModeStartScene = boot;
                else
                    Debug.LogWarning($"[PlayFromBoot] {BootPath} not found.");
            }
            else
            {
                EditorSceneManager.playModeStartScene = null;
            }
        }

        [MenuItem(MenuPath)]
        private static void Toggle()
        {
            var next = !EditorPrefs.GetBool(PrefKey, true);
            EditorPrefs.SetBool(PrefKey, next);
            Apply();
        }
    }
}
#endif
