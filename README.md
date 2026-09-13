# polonium — launcher z cheatami do minecrafta

## versions

Gotowe buildy leżą w [releases](../../releases) oraz w folderze [`Versions/`](Versions).

| wersja | plik | mc |
|---|---|---|
| 0.4.36 | `Polonium-0.4.36.exe` | 1.8 → 26.2 (wszystkie 74) |

## All Versions Compiled

Polonium kompilowany dla wszystkich 74 wersji Minecrafta:

1.8, 1.8.1, 1.8.2, 1.8.3, 1.8.4, 1.8.5, 1.8.6, 1.8.7, 1.8.8, 1.8.9,
1.9, 1.9.1, 1.9.2, 1.9.3, 1.9.4,
1.10, 1.10.1, 1.10.2,
1.11, 1.11.1, 1.11.2,
1.12, 1.12.1, 1.12.2,
1.13, 1.13.1, 1.13.2,
1.14, 1.14.1, 1.14.2, 1.14.3, 1.14.4,
1.15, 1.15.1, 1.15.2,
1.16, 1.16.1, 1.16.2, 1.16.3, 1.16.4, 1.16.5,
1.17, 1.17.1,
1.18, 1.18.1, 1.18.2,
1.19, 1.19.1, 1.19.2, 1.19.3, 1.19.4,
1.20, 1.20.1, 1.20.2, 1.20.3, 1.20.4, 1.20.5, 1.20.6,
1.21, 1.21.1, 1.21.2, 1.21.3, 1.21.4, 1.21.5, 1.21.6, 1.21.7, 1.21.8, 1.21.9, 1.21.10, 1.21.11,
26.1, 26.1.1, 26.1.2, 26.2

## archive

Jary moda per wersja MC: `Archive/{mc}/{buildID}/build.json`
(hash SHA256, URL do release). Spis: [`Archive/index.json`](Archive/index.json).
Retencja: ostatnie 70 buildów na wersję (resztę tnie `scripts/archive-build.js`).

## start (dev)

```powershell
npm install
npm start
```

Menu w grze: prawy ctrl (zapas: f8 / insert).

## auto-attach cheatów

Przy cheats ON launcher sam, bez klikania: dociąga Fabric installera,
instaluje loader dla danej wersji MC i dokleja `mods/polonium-*.jar`
do instancji. Wersje bez moda lecą vanilla + flaga.

## lokalny host (ingame)

Launcher stawia WebView host tylko na `127.0.0.1:8905`:

- `GET /` — ClickGUI w przeglądarce
- `GET /api/modules` — stany cheatów (json)
- `POST /api/modules` — `{"id":"killaura","enabled":true}`
- `GET /api/events` — SSE ze zmianami na żywo
- `GET /api/settings` — ustawienia launchera

Mod w grze polluje `/api/modules` albo słucha SSE i nakłada efekty.
