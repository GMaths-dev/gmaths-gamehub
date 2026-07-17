# Sum Pyramid — Grade 2, Lesson 6

This is a self-contained game package for GMaths GameHub. It runs directly
from this folder, inside the hub iframe, with no build step or internet-hosted
assets.

## Main files

- `index.html`: responsive page shell for iframe play.
- `vendor/phaser.min.js`: local Phaser runtime.
- `js/main.js`: Phaser configuration and scene registration.
- `js/core/config.js`: resolution, typography, colors and access digest.
- `js/data/questions.js`: editable Sum Pyramid question bank.
- `js/scenes/BaseScene.js`: shared buttons, audio, text and transitions.
- `js/scenes/Preloader.js`: image and audio asset manifest.
- `js/scenes/StoryScenes.js`: narrative scenes.
- `js/scenes/GameScene.js`: puzzle interaction and reward flow.
- `js/scenes/SandstormTransition.js`: lightweight sandstorm wipe.
- `assets/`: images and audio.

## Editing the game

1. Replace or extend entries in `js/data/questions.js`.
2. Update asset filenames in `js/scenes/Preloader.js`.
3. Change story content in `js/scenes/StoryScenes.js`.
4. Keep scene registration in `js/main.js` in the intended play order.

All paths must remain relative so the game works locally and on GitHub Pages.
