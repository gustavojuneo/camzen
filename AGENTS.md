# Repository Guidelines

## Project Structure & Module Organization

Camzen — Electron + React + TypeScript app for Linux X11/Wayland virtual camera workflows.

- `src/main/`: Electron main process, preferences, FFmpeg, `v4l2loopback`, and device handling.
- `src/preload/`: preload bridge and renderer API declarations.
- `src/renderer/`: React UI, hooks, styles, and assets.
- `src/shared/`: TypeScript types used across processes.
- `build/` and `resources/`: packaging assets and app resources.
- `out/` and `dist/`: generated output; do not edit directly.

## Build, Test, and Development Commands

- `npm install`: install Node and Electron app dependencies.
- `npm run dev`: start Electron Vite in development mode.
- `npm run start`: preview a built app.
- `npm run typecheck`: run Node and web TypeScript checks.
- `npm run lint`: run ESLint with cache.
- `npm test`: run Vitest once; currently passes even when no tests exist.
- `npm run build`: typecheck and build the app.
- `npm run build:unpack`: create an unpacked Electron directory.
- `npm run build:linux`: build Linux packages with electron-builder.

Linux development expects system tools such as `v4l2loopback`, `v4l-utils`, and `ffmpeg`.

## Coding Style & Naming Conventions

Use TypeScript for app code and TSX for React components. Follow the component-per-folder style, for example `src/renderer/src/components/CameraPreview/CameraPreview.tsx`.

Formatting uses EditorConfig and Prettier: 2-space indentation, LF endings, UTF-8, final newline, single quotes, no semicolons, `printWidth: 100`, and no trailing commas. ESLint adds Electron Toolkit TypeScript, React, Hooks, and React Refresh rules.

Keep process boundaries explicit: system work in `src/main/modules`, renderer state/UI logic in hooks or components, and cross-process contracts in `src/shared` or preload declarations.

## Testing Guidelines

Vitest is configured via `npm test`. Add tests close to covered code using names such as `pipeline.test.ts` or `useBackgrounds.test.ts`. Prioritize shared logic, IPC contracts, frame processing, preferences persistence, and bug fixes. Run `npm run typecheck` and `npm test` before submitting.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commits: `feat: ...`, `fix: ...`, `fix(scope): ...`, and `refactor(scope): ...`. Use an imperative subject; add an indented bullet body for multi-part changes:

```text
feat: add background persistence, camera toggle and "no filter" mode

    - Register app-bg:// protocol and backgrounds:save IPC
    - Add camera on/off toggle button in the header
    - Introduce 'none' background kind for raw webcam feed
```

Pull requests should include a concise summary, validation commands, linked issues when applicable, and screenshots or recordings for UI changes. Mention Linux/Wayland, camera device, or packaging assumptions when they affect review.

## Security & Configuration Tips

Do not commit imported user media, generated packages, or local machine paths. Be careful with `pkexec`, `modprobe`, FFmpeg, and virtual camera devices; keep privileged operations in the main process and expose typed, minimal APIs through preload.

## CI/CD

GitHub Actions workflow at `.github/workflows/release.yml` builds and publishes an AppImage to GitHub Releases on every `v*` tag push.

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow runs on `ubuntu-latest`, installs dependencies with `npm ci`, and uploads `dist/*.AppImage` to the release using `GITHUB_TOKEN`.
