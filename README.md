# Camzen

> Virtual camera app for Linux — replace your webcam background and stream the result to any app via a virtual camera device.

Built with Electron + React + TypeScript, targeting X11 and Wayland desktops.

## Features

- Live webcam preview with camera device selection
- Camera toggle and horizontal mirror controls
- Background replacement: no filter, solid color, blur, image, and video
- Person segmentation via MediaPipe/TensorFlow.js (active only when a background filter is selected)
- Virtual camera output through `v4l2loopback` + FFmpeg — start/stop from the preview panel
- Persistent preferences (backgrounds, settings, theme)
- Status bar showing dependency health (ffmpeg, v4l2loopback, v4l-utils, webcam)
- Linux packages: `.AppImage`, `.deb`, `.rpm`

## Requirements

Install system dependencies before running:

**Ubuntu/Debian**
```bash
sudo apt install v4l2loopback-dkms v4l-utils ffmpeg
```

**Fedora**
```bash
sudo dnf install v4l2loopback ffmpeg v4l-utils
```

**Arch Linux**
```bash
sudo pacman -S v4l2loopback-dkms ffmpeg v4l-utils
```

## Getting Started

```bash
npm install
npm run dev
```

Click **Iniciar** in the preview panel to load `v4l2loopback` and start streaming to the virtual camera. Click **Parar** to stop.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start in development mode |
| `npm run build` | Typecheck and build |
| `npm run build:linux` | Build Linux packages |
| `npm run typecheck` | Run TypeScript checks |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest |

## Release

Push a version tag to trigger the GitHub Actions workflow, which builds and publishes the AppImage automatically:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Notes

- On Wayland, the app sets `ELECTRON_OZONE_PLATFORM_HINT=wayland` and `--ozone-platform=wayland` automatically based on `XDG_SESSION_TYPE`.
- Segmentation is skipped when the selected background is **No filter**, avoiding unnecessary ML model load.
- The default virtual camera device is `/dev/video10` (configurable in the Output settings panel).
- The app calls `pkexec modprobe v4l2loopback` automatically when starting the virtual camera; polkit must be configured on the system.
