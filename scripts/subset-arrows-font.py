#!/usr/bin/env python3
"""Rebuild public/fonts/source-sans-3-arrows.woff.

The arrows (U+2190-2199) and the ket brackets (U+27E8-27E9) are missing from
the Source Sans 3 files next/font loads, so assets/css/style.css adds this
subset to the same family with a matching unicode-range (and assets/css/qff.css
does the same for the Fall Fest page's IBM Plex Sans). Keep the lists in step:
a character added here must also be added to both unicode-ranges.

Source: Adobe's Source Sans 3 variable font (SIL Open Font License 1.1),
https://github.com/adobe-fonts/source-sans/raw/release/VF/SourceSans3VF-Upright.ttf
The OFL reserves the name "Source", so the subset is renamed CQCArrows.

Usage (needs fontTools: pip install fonttools):
    python3 scripts/subset-arrows-font.py SourceSans3VF-Upright.ttf public/fonts/source-sans-3-arrows.woff
"""
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

src, out = sys.argv[1], sys.argv[2]
# Keep the source's timestamp so a rebuild from the same file is byte-identical.
font = TTFont(src, recalcTimestamp=False)
opts = subset.Options()
opts.name_IDs = ['*']
opts.name_languages = ['*']
opts.layout_features = ['*']
opts.notdef_outline = True
opts.flavor = 'woff'
sub = subset.Subsetter(opts)
sub.populate(unicodes=list(range(0x2190, 0x219A)) + [0x27E8, 0x27E9])
sub.subset(font)
for rec in font['name'].names:
    text = rec.toUnicode()
    new = (text.replace('Source Sans 3 VF', 'CQCArrows').replace('SourceSans3VF', 'CQCArrows')
           .replace('Source Sans 3', 'CQCArrows').replace('SourceSans3', 'CQCArrows'))
    if new != text:
        rec.string = new
font.flavor = 'woff'
font.save(out)
check = TTFont(out)
print('flavor', check.flavor, 'cmap', [hex(c) for c in sorted(check.getBestCmap())])
print('names', {r.nameID: r.toUnicode() for r in check['name'].names if r.platformID == 3 and r.nameID in (1, 4, 6, 16, 25)})
print('axes', [(a.axisTag, a.minValue, a.maxValue) for a in check['fvar'].axes])
