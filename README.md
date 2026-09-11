# polonium — launcher z cheatami do minecrafta

## versions

Gotowe buildy leżą w [releases](../../releases) oraz w folderze [`Versions/`](Versions).

| wersja | plik | mc |
|---|---|---|
| 0.1.0 | `Polonium-0.1.0.exe` | 1.8 → 26.2 (wszystkie 74) |

## start (dev)

```powershell
npm install
npm start
```

Menu w grze: prawy ctrl (zapas: f8 / insert).

## lokalny host (ingame)

Launcher stawia WebView host tylko na `127.0.0.1:8905`:

- `GET /` — ClickGUI w przeglądarce
- `GET /api/modules` — stany cheatów (json)
- `POST /api/modules` — `{"id":"killaura","enabled":true}`
- `GET /api/events` — SSE ze zmianami na żywo
- `GET /api/settings` — ustawienia launchera

Mod w grze polluje `/api/modules` albo słucha SSE i nakłada efekty.
