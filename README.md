# Max's Gallery

A static portfolio site for coding projects. The gallery itself follows the
Vivid+Co style reference (obsidian canvas, bone-white weight-400 type, a single
RGB-split prism artifact as the only colour). Every project page carries its own,
completely different UI style.

No build step. Open `index.html` in a browser, or serve the folder:

```
python -m http.server 8000
```

## Structure

```
index.html            gallery home (hero, work list, about, contact)
styles.css            design tokens + gallery styles
projects.js           project index — the work list is rendered from this array
gallery.js            work list rendering, hover preview card, scroll reveals
projects/
  tidewatch.html      brutalist acid-yellow terminal
  lumen.html          soft aurora pastels
  inkwell.html        editorial paper & ink
  pulse.html          retro-futurist neon (live canvas visualiser, optional mic input)
```

## Adding a project

1. Create `projects/<slug>.html` with whatever style you like. Include a link back to `../index.html`.
2. Add an entry to the array in `projects.js`: `slug`, `title`, `year`, `label`, `style`, `href`, and a `preview` HTML snippet (roughly 300×200) shown in the hover card on the home page.
3. If the preview uses a web font, add it to the Google Fonts link in `index.html`.

The four current projects are placeholders. Their GitHub and demo links point to `#`.
