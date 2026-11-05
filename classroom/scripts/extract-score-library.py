"""Extract each supplied score-library image without resampling the source.

Run with a Python environment containing Pillow. The original reference and
output locations are resolved from this script, independent of the shell cwd.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/assets/score-library'
SOURCE = ROOT / 'design-reference/score-library.png'

ASSETS = [
    ('hero-left', (0, 50, 425, 291)),
    ('hero-piano', (1284, 50, 1448, 291)),
    ('hero-wall', (425, 242, 1060, 263)),
    ('avatar', (1229, 15, 1250, 36)),
    ('cover-sunny', (312, 394, 515, 490)),
    ('cover-confession', (530, 394, 729, 490)),
    ('cover-rice', (744, 394, 946, 490)),
    ('cover-fireworks', (963, 394, 1169, 490)),
    ('cover-windmill', (1186, 394, 1390, 490)),
    ('cover-nocturne', (312, 613, 515, 710)),
    ('cover-secret', (530, 613, 729, 710)),
    ('cover-north', (744, 613, 946, 710)),
    ('cover-simple', (963, 613, 1169, 710)),
    ('cover-clock', (1186, 613, 1390, 710)),
    ('forum-piano', (323, 906, 564, 996)),
    ('forum-guitar', (577, 906, 818, 996)),
    ('forum-vocal', (830, 906, 1065, 996)),
    ('paper-texture', (0, 400, 36, 800)),
    ('page-leaves', (0, 1018, 42, 1086)),
]


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as reference:
        for name, bounds in ASSETS:
            reference.crop(bounds).save(OUTPUT / f'{name}.png')
        manifest = {
            'source': str(SOURCE.relative_to(ROOT)),
            'sourceSize': list(reference.size),
            'coordinateConvention': 'left, top, right exclusive, bottom exclusive',
            'assets': [{'file': f'{name}.png', 'bounds': list(bounds)} for name, bounds in ASSETS],
            'generatedAlternatives': [{
                'file': 'cover-sunny-clean.png',
                'prompt': 'cover-sunny-clean.prompt.md',
                'mode': 'built-in image_gen',
                'usedInPage': False,
            }],
        }
    (OUTPUT / 'source-assets.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
    )
    print(f'Extracted {len(ASSETS)} separate source images to {OUTPUT}')


if __name__ == '__main__':
    main()
