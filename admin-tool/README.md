# GMaths Local Game Admin

This local-only tool manages the adjacent GMaths GameHub catalog and imports game ZIP packages with static checks and a minimal-change preview.

## Security model

- The server binds only to `127.0.0.1`.
- An admin password is required for every session.
- Session cookies are HTTP-only and kept in memory.
- Uploaded ZIP paths, symbolic links, compression types, file counts, and extracted-size limits are validated by the built-in Node extractor.
- The original ZIP is preserved under the ignored `.data` directory.
- Publishing never overwrites an existing game folder or duplicate catalog ID.
- Deleted game sources and covers are moved to the ignored `.data/trash` directory before their catalog records are removed.

## Start

Run:

```powershell
.\start-admin.ps1
```

Enter a local admin password when prompted. The launcher selects an available local port, starts the server, and opens the correct browser address automatically. Use the same password again on the login page and keep the PowerShell window open.

## Manage existing games

- Edit title, grade, subject, lesson/topic, description, orientation, order, and featured status.
- Replace or remove a cover image.
- Hide a game from the public home page without removing its source code.
- Show a hidden game again.
- Delete a game after entering its exact title. Its source and cover are preserved in `.data/trash`.
- Grade changes and deletion support OneDrive folders: when Windows blocks a direct rename, the tool copies the files, verifies their SHA-256 hashes, and only then removes the originals.

## Import workflow

1. Upload ZIP.
2. Review static checks and the proposed minimal changes.
3. Enter catalog metadata.
4. Prepare and play the staging preview.
5. Publish only after approval.

Publishing copies the staged game to `games/grade-N/<slug>`, copies a thumbnail candidate when available, and appends the catalog record to `data/games.json`.

After local testing, use **Publish to GitHub** at the top of the admin page. It commits only public website paths (`assets`, `data`, `games`, `thumbnails`, and the public HTML entry files) and pushes them to the configured branch. GitHub authentication is handled by Git Credential Manager on this computer; no GitHub token is stored by the admin tool.

By default, the tool targets the GameHub folder directly above `admin-tool`. Set `GMATHS_HUB_ROOT` only when testing against a separate copy.
