# RDX Changelog

Run `rdx add changelog` from an RDX project to install the plugin and activate it
in `rdx.config.ts`. Run `rdx changelog new 1.2.0` to create a draft with the
version, current date, and a default title. Add one Markdown file per release under `changelog/`, with
`title`, `version`, and `date` in its frontmatter. RDX lists the releases newest
first at `/changelog` and adds a link after **Docs** in the navigation.

Versions follow semantic versioning, including prereleases such as `1.2.0-beta.1`.
Release notes are sorted by date first, then by semantic version precedence when
dates match. Stable versions precede their prereleases; `+build` metadata does
not affect precedence.
