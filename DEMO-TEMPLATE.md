# Restaurant Demo Template

This is the original site with one template-only feature: numbered logo previews.

## How to show a restaurant demo

Use the same deployed site and add the demo number:

- `?demo=01`
- `?demo=02`
- `?demo=03`
- ...
- `?demo=100`

Example:
`https://your-site.com/?demo=02`

The entire site stays the same. Only the logo changes.

## Logo files

Logos are in `images/logos/`:

`01.jpg` ... `100.jpg`

For restaurant #02, replace `images/logos/02.jpg` with that restaurant's logo. The site will then show it everywhere the logo is used.

Common image extensions are supported: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`.
If you change the extension, remove/rename the old numbered file so there is only one logo for that number.
