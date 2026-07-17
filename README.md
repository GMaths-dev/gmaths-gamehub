# GMaths GameHub

A dependency-free static game library for GitHub Pages. It loads the catalog and site options from JSON, supports search and filters, and opens every game in a full-screen-friendly iframe.

Public teacher website: <https://gmaths-dev.github.io/gmaths-gamehub/>

## Run locally

Open this folder in VS Code, install the **Live Server** extension if needed, then right-click `index.html` and choose **Open with Live Server**. Fetching JSON does not work reliably by opening the HTML directly with `file://`.

You can also serve the folder with any static HTTP server.

## Add a game

1. Copy `games/game-template` into `games/grade-N/your-game`.
2. Keep the game self-contained. Its CSS, JavaScript, images, and audio must stay inside its own folder.
3. Update `config.js` and implement the activity in `game.js`.
4. Add a 16:10 WebP thumbnail under `thumbnails/grade-N`.
5. Add the game record to `data/games.json`. Use a unique `id` and a relative `gamePath`.

Each game must work with pointer/touch input, scale from iPad to laptop, and run independently at its own `index.html`. Navigation and full-screen behavior are handled by GameHub.

## Game standard

Every imported or newly created game must follow these rules:

- Keep all HTML, CSS, JavaScript, images, audio, fonts, and third-party runtime files inside the game's own folder.
- Use only relative paths. A game must not import CSS or JavaScript from the GameHub root.
- Support mouse and touch without requiring hover interactions.
- Scale cleanly from iPad to laptop and remain usable in an iframe.
- Do not add shared Replay, Sound On/Off, or Exit buttons inside the game. GameHub handles returning to the library and full-screen mode.
- GameHub must full-screen the game iframe itself. The GameHub toolbar is excluded, and the browser's `Esc` key exits full screen.
- Keep status or instruction text inside its header safe area. For a 1920×1080 Phaser canvas, use approximately `28px` for secondary status text.
- Provide a thumbnail. The mathematical symbol fallback is shown only when the thumbnail is missing or fails to load.
- An optional password screen may be used before the story or activity. Store only a one-way digest in source code—never a plain-text password—and keep its background and assets local to the game.
- If a password input is used, its placeholder must fit on one line on iPad and laptop layouts.
- Never store API keys, service credentials, or other secrets in the game source.

## Scaffold only

To recreate an empty folder tree from the parent folder:

```powershell
.\gmaths-gamehub\setup.ps1 -Root .\new-gamehub
```

## Local admin importer

The password-protected local admin tool is available under `admin-tool`. It can edit catalog metadata and covers, hide or show games, safely delete games into a local trash folder, inspect ZIP packages, prepare previews, and publish approved games into this GameHub.

```powershell
cd admin-tool
.\start-admin.ps1
```

See `admin-tool/README.md` for setup and security details.

After testing a local change, use **Publish to GitHub** in the admin tool. Only public GameHub files are committed by that action; local passwords, uploads, logs, staging jobs, and trash remain on this computer.

## Deploy on GitHub Pages

Commit this folder to a repository, then configure Pages to publish from the branch and folder containing `index.html`. All paths are relative, so project Pages URLs are supported.
