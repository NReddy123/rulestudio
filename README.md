# RuleStudio

RuleStudio is a client-side decision-rule editor built with React and Vite.

## Features

- Create, rename, edit, delete, search, export, and persist rules in local storage.
- Build rules with multiple AND conditions and validate required values.
- Evaluate rules against sample JSON in the **Test rule** tab.
- Inspect the current rule as JSON and refresh the local cache status.

## Development

```sh
npm install
npm run dev
```

Run `npm run lint` and `npm run build` before submitting changes.

## GitHub Pages

The site is deployed automatically by GitHub Actions whenever changes are pushed
to `main`. Enable GitHub Pages in the repository settings with **Source** set to
**GitHub Actions**, then open:

```text
https://<github-user>.github.io/rulestudio/
```

The workflow can also be started manually from the **Actions** tab.
