# Aetheria Unity Client

Unity 6 (`com.unity3d.6000.x`). Android-first, iOS planned.

## Open the project

```
File → Open Project → unity/
```

Unity will populate `Library/`, `Logs/`, etc. on first import (gitignored).

## Folder layout

```
Assets/
├── Scripts/
│   ├── Core/          # boot, service locator, configuration
│   ├── Models/        # plain C# DTOs that match openapi.yaml schemas
│   ├── Services/      # ApiClient, AuthService, CharacterService, ChatService...
│   ├── Controllers/   # MonoBehaviours that wire screens to services
│   ├── Views/         # UI Toolkit panels (one *.cs + one *.uxml per screen)
│   └── Util/          # extensions, json helpers
├── UI/                # UI Toolkit assets (.uxml, .uss, ThemeStyleSheet)
├── Audio/             # SFX, BGM (lightweight in MVP)
├── Animations/        # animation clips and controllers
├── Prefabs/           # screen prefabs, world prefabs
├── Resources/         # ApiConfig.asset, tiny global SOs
├── Addressables/      # remote content (item icons, region art, audio)
└── Scenes/
    ├── Boot.unity     # bootstrap → service init → next scene
    ├── Login.unity
    └── Main.unity     # tabbed UI Toolkit shell (world, quests, inventory, ...)
```

## Editor packages required

- `com.unity.ui` (UI Toolkit, built-in in U6)
- `com.unity.addressables`
- `com.unity.nuget.newtonsoft-json`
- `com.unity.test-framework`
- `com.unity.localization` (post-MVP)

## Configuration

`Assets/Resources/ApiConfig.asset` is a ScriptableObject with:
- `apiBaseUrl` (default `http://10.0.2.2:3000` for Android emulator → localhost)
- `wsBaseUrl`
- `googleClientId`

You change these per build; never hard-code URLs in scripts.

## Run

1. Make sure the backend is up: `cd ../infra && docker compose up -d`
2. Open `Boot.unity` and press Play.

For Android device testing: set `apiBaseUrl` to your laptop's LAN IP and ensure
your phone and laptop are on the same network.
