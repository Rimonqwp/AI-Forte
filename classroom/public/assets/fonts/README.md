# Chinese brush font

`bakudai-regular.woff2` is the unmodified Bakudai Regular web font from
[max32002/bakudaifont, release 1.48](https://github.com/max32002/bakudaifont/tree/1.48).
It is based on Kouzan Aoyagi's brush lettering, with additional Chinese glyphs
by the Bakudai project. Distributed under the SIL Open Font License 1.1;
see `OFL-Bakudai.txt` and the copyright metadata embedded in the font.

Source: <https://raw.githubusercontent.com/max32002/bakudaifont/1.48/webfont/Bakudai-Regular.woff2>

The shared `--font-brush` in `src/fonts.css` uses Ma Shan Zheng for Simplified
Chinese and Bakudai for Traditional Chinese. Keep the full upstream character
set so new headings also work without regenerating a text-specific subset.
The font is served locally and only requested when its face is used.
