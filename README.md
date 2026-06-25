# Virtual Camera

Aplicacao Electron + React para Linux X11/Wayland que captura uma webcam real, permite trocar o fundo no preview e publica o resultado em uma camera virtual via `v4l2loopback` + FFmpeg.

## Escopo Atual

- Electron + React + TypeScript com Vite.
- Tailwind CSS, `tailwind-merge` e `tailwind-variants`.
- Preview de webcam com selecao de dispositivo.
- Segmentacao MediaPipe/TensorFlow opcional.
- A aplicacao sempre inicia com segmentacao desligada; use o botao `Ativar segmentacao` no preview para carregar o modelo.
- Fundos solidos, blur do fundo original e importacao de imagem/video.
- IPC tipado para checagem de dependencias, `v4l2loopback`, FFmpeg e preferencias.
- Targets Linux `.deb`, `.AppImage` e `.rpm`.

## Dependencias do Sistema

Ubuntu/Debian:

```bash
sudo apt install v4l2loopback-dkms v4l-utils ffmpeg
```

Fedora:

```bash
sudo dnf install v4l2loopback ffmpeg v4l-utils
```

Arch Linux:

```bash
sudo pacman -S v4l2loopback-dkms ffmpeg v4l-utils
```

## Desenvolvimento

```bash
npm install
npm run dev
```

O processo principal verifica `XDG_SESSION_TYPE` ao iniciar. Em Wayland, define `ELECTRON_OZONE_PLATFORM_HINT=wayland`, `--ozone-platform=wayland` e decoracoes Wayland. Em X11, define `ELECTRON_OZONE_PLATFORM_HINT=x11` e `--ozone-platform=x11`.

## Validacao

```bash
npm run typecheck
npm test
npm run build
```

## Build Linux

```bash
npm run build:linux
```

Para criar a camera virtual pelo app, use `Preparar v4l2`; isso chama `pkexec modprobe v4l2loopback ...` e depende de polkit configurado no sistema.
