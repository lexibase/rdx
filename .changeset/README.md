# RDX release notes

Run `pnpm release:note` to record the changed public packages, their bump types
and a short English release note. A patch fixes behavior, a minor adds compatible
features, and a major changes the public contract incompatibly.

The framework and creator share their release number. Other packages keep
independent versions. For an optional-plugin-only release, also select
`@lexibase/rdx` so the release has a documentation edition. Review framework bump
severity rather than inferring breaking changes from commit labels.

Run `pnpm release:plan` to preview, then `pnpm release:prepare`. Preparation updates
versions, the creator template, the root changelog, publishing instructions, API
edition and documentation snapshot. It does not commit, tag, push or publish.

Review and commit all prepared files in one PR. GitHub Actions runs the complete
checks and installed-package suite. Use the generated publication checklist after
merging. See [PUBLISHING.md](../PUBLISHING.md).
