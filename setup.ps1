param([string]$Root = "gmaths-gamehub")

$directories = @(
  "assets/css", "assets/images/logo", "assets/images/icons", "assets/images/placeholders", "assets/js",
  "data", "games/game-template", "games/grade-1", "games/grade-2", "games/grade-3", "games/extra",
  "thumbnails/grade-1", "thumbnails/grade-2", "thumbnails/grade-3", "thumbnails/extra"
)
$files = @(
  "index.html", "game.html", "404.html", "README.md",
  "assets/css/main.css", "assets/css/game.css", "assets/css/responsive.css",
  "assets/js/app.js", "assets/js/catalog.js", "assets/js/game-loader.js", "assets/js/search.js",
  "data/games.json", "data/settings.json",
  "games/game-template/index.html", "games/game-template/game.css", "games/game-template/config.js", "games/game-template/game.js"
)

New-Item -ItemType Directory -Path $Root -Force | Out-Null
$directories | ForEach-Object { New-Item -ItemType Directory -Path (Join-Path $Root $_) -Force | Out-Null }
$files | ForEach-Object {
  $path = Join-Path $Root $_
  if (-not (Test-Path -LiteralPath $path)) { New-Item -ItemType File -Path $path | Out-Null }
}
Write-Host "Created GMaths GameHub structure at: $((Resolve-Path $Root).Path)"
