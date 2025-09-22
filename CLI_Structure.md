> The CLI (`create-rdx`) generates a standalone content structure (`MyDocs/`) that is not a Next.js project.
>
> The system inside `apps/web/` must be configured to consume this structure as its documentation source.  
> Specifically:
>
> - `docs/` must be treated as the `apps/web/app/docs/(canary)`
> - `versioned/` must be treated as the `apps/web/app/docs/(versioned)`
> - `archived/` must be treated as the `apps/web/app/docs/(archived)`  
>   This behavior must be handled by the system logic - the CLI only provides the content.

- When running the command to initialize a project `npx create-rdx`, generate the [Template](./packages/create-rdx/templates/):

```bash
MyDocs
├── docs
│   └── cat-01
│       ├── _category.json
│       └── intro.mdx
├── rdx.config.ts
├── package.json
└── README.md
```

- When running the command to version a project `npx version-rdx 1.0.0`, create a new `versioned` folder and copy the contents of `docs/` into `versioned/version-1.0.0`(folders and `.mdx` files)

```diff
  MyDocs
  ├── docs
+ ├── versioned
+ │   └── version-1.0.0
+ │       └── cat-01
+ │           ├── _category.json
+ │           └── intro.mdx
  ├── rdx.config.ts
  ├── package.json
  ├── readme.md
```

- When running the command to archive a project `npx archive-rdx 1.0.0`, create a new `archived` folder and move the contents of `versioned/` into `archived/version-1.0.0` (folders and `.mdx` files)

```diff
  MyDocs
  ├── docs
  ├── versioned
- │   └── version-1.0.0
- │       └── cat-01
- │           ├── _category.json
- │           └── intro.mdx
+ ├── archived
+ │   └── version-1.0.0
+ │       └── cat-01
+ │           ├── _category.json
+ │           └── intro.mdx
  ├── rdx.config.ts
  ├── package.json
  ├── readme.md
```
