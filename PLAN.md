# Plano de Desenvolvimento: Virtual Camera App (Linux/Wayland)

## Visão Geral

Aplicação desktop desenvolvida com **Electron + React** que captura a webcam real do usuário,
remove o fundo via Machine Learning e substitui por uma imagem ou vídeo escolhido, expondo
o resultado como uma **câmera virtual** reconhecida pelo sistema operacional (Zoom, Meet, OBS, etc.).

**Escopo inicial:** Linux com Wayland.

---

## Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Shell desktop | Electron 30+ | Acesso a APIs nativas, empacotamento |
| Interface | React 18 + Vite | UI reativa e componentizada |
| Estilos | Tailwind CSS | Agilidade no desenvolvimento |
| Segmentação | MediaPipe Selfie Segmentation | Remoção de fundo em tempo real via WASM |
| Composição | OffscreenCanvas + WebGL | Performance na renderização de frames |
| Câmera virtual | v4l2loopback (kernel module) + FFmpeg | Driver de loopback de vídeo no Linux |
| IPC Electron | contextBridge + ipcMain/ipcRenderer | Comunicação segura entre processos |
| Empacotamento | electron-builder | Geração de .deb / .AppImage |

---

## Requisitos do Sistema (Linux/Wayland)

- Kernel Linux com suporte a `v4l2loopback` (instalável via `apt`, `pacman`, etc.)
- FFmpeg instalado no sistema
- Node.js 20+
- Wayland compositor (GNOME, KDE Plasma, Sway, etc.)
- Permissão de acesso à webcam (`/dev/video*`)

---

## Arquitetura da Aplicação

```
┌─────────────────────────────────────────────────────┐
│                   ELECTRON MAIN                     │
│                                                     │
│  ┌─────────────────┐    ┌────────────────────────┐  │
│  │  v4l2loopback   │    │  child_process (FFmpeg) │  │
│  │  Manager        │    │  Frame Pipe             │  │
│  └────────┬────────┘    └───────────┬────────────┘  │
│           │                         │               │
│           └──────────┬──────────────┘               │
│                      │ IPC                          │
└──────────────────────┼──────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────┐
│              ELECTRON RENDERER (React)               │
│                      │                              │
│  ┌───────────────────▼──────────────────────────┐  │
│  │              Pipeline de Vídeo               │  │
│  │                                              │  │
│  │  Webcam → MediaPipe → Canvas → OffscreenCanvas│  │
│  │           (segmentação)  (composição)         │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Preview    │  │  Background  │  │ Settings  │  │
│  │  Component  │  │  Selector    │  │  Panel    │  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────┘
         │ frames raw (pipes)
         ▼
┌─────────────────────┐
│   /dev/video_virt   │  ← câmera virtual (v4l2loopback)
│   (câmera virtual)  │
└─────────────────────┘
         │
         ▼
  Zoom / Meet / OBS / etc.
```

---

## Fases de Desenvolvimento

### Fase 1 — Setup do Projeto (Semana 1)

**Objetivo:** Estrutura base do Electron + React funcionando.

- [ ] Inicializar projeto com `electron-vite` (template React + TypeScript)
- [ ] Configurar `electron-builder` para targets `.deb` e `.AppImage`
- [ ] Configurar `contextBridge` e IPC com tipos TypeScript
- [ ] Resolver compatibilidade Electron + Wayland:
  - Flag `--ozone-platform=wayland` no launch
  - Variável de ambiente `ELECTRON_OZONE_PLATFORM_HINT=wayland`
- [ ] Configurar ESLint + Prettier
- [ ] Setup de testes com Vitest

**Entregável:** App abre no Wayland sem erros, mostra tela em branco funcional.

---

### Fase 2 — Captura e Preview da Webcam (Semana 2)

**Objetivo:** Capturar webcam real e exibir no app.

- [ ] Listar dispositivos de vídeo disponíveis (`navigator.mediaDevices.enumerateDevices`)
- [ ] Capturar stream via `getUserMedia` com constraints configuráveis (resolução, FPS)
- [ ] Exibir stream em tempo real em elemento `<video>`
- [ ] Componente de seleção de câmera (dropdown)
- [ ] Tratamento de erros de permissão (Wayland pode exigir portal XDG)
- [ ] Investigar e implementar suporte ao **XDG Desktop Portal** (`pipewire-camera`) para Wayland:
  - Em Wayland puro, `getUserMedia` pode exigir mediação via portal
  - Usar `electron.desktopCapturer` como fallback ou integração via `pipewire`

**Entregável:** Preview da webcam exibido corretamente no app rodando em Wayland.

---

### Fase 3 — Remoção de Fundo com MediaPipe (Semana 3)

**Objetivo:** Segmentar pessoa do fundo em tempo real.

- [ ] Integrar `@mediapipe/tasks-vision` (SelfieSegmenter)
- [ ] Configurar WASM runtime no contexto Electron (ajuste de `publicPath`)
- [ ] Pipeline de processamento:
  1. Frame do `<video>` → `drawImage` em canvas oculto
  2. Canvas → MediaPipe `SelfieSegmenter.segment()`
  3. Máscara de segmentação → aplicar no canvas de composição
- [ ] Implementar composição WebGL para performance:
  - Shader para aplicar máscara (alpha blend)
  - Fundo virtual renderizado abaixo da pessoa
- [ ] Controle de qualidade: slider de suavização de borda (feathering)
- [ ] Medição de FPS e otimização para manter ≥ 24fps

**Entregável:** Fundo removido em tempo real no preview interno do app.

---

### Fase 4 — Seleção de Fundos (Semana 4)

**Objetivo:** UI para escolher e gerenciar fundos virtuais.

- [ ] Suporte a **imagem estática** como fundo (JPG, PNG, WebP)
- [ ] Suporte a **vídeo em loop** como fundo (MP4, WebM)
- [ ] Suporte a **cor sólida** como fundo (color picker)
- [ ] Suporte a **desfoque gaussiano** do fundo original (blur)
- [ ] Galeria de fundos pré-instalados (pack inicial com ~10 imagens)
- [ ] Import de fundo personalizado pelo usuário (file picker)
- [ ] Persistência das preferências (via `electron-store`)
- [ ] Gerenciar backgrounds salvos: adicionar, renomear, remover

**Entregável:** Usuário consegue trocar o fundo e a mudança reflete no preview imediatamente.

---

### Fase 5 — Câmera Virtual com v4l2loopback (Semanas 5–6)

**Objetivo:** Expor o vídeo processado como câmera virtual no sistema.

#### 5.1 — Setup do v4l2loopback

- [ ] Detectar se `v4l2loopback` está instalado/carregado:
  ```bash
  lsmod | grep v4l2loopback
  ```
- [ ] No `ipcMain`, implementar helper para carregar o módulo:
  ```bash
  sudo modprobe v4l2loopback devices=1 video_nr=10 card_label="VirtualCam" exclusive_caps=1
  ```
- [ ] UI para guiar o usuário na instalação (via `pkexec` / polkit para elevação de privilégio)
- [ ] Detectar automaticamente o device criado (`/dev/video10`)

#### 5.2 — Pipe de Frames para o v4l2loopback

- [ ] No Renderer: capturar frames do canvas processado via `canvas.captureStream(30)`
- [ ] Converter stream para dados raw RGB via `ImageData`
- [ ] Enviar frames via IPC para o processo main (usar `SharedArrayBuffer` para performance)
- [ ] No Main: receber frames e escrever no dispositivo v4l2 via FFmpeg:
  ```bash
  ffmpeg -f rawvideo -pixel_format rgb24 -video_size 1280x720 \
         -framerate 30 -i pipe:0 \
         -f v4l2 /dev/video10
  ```
- [ ] Gerenciar ciclo de vida do processo FFmpeg (start/stop com a câmera virtual)

#### 5.3 — Validação

- [ ] Testar câmera virtual no OBS Studio
- [ ] Testar no Google Chrome (Meet/Hangouts)
- [ ] Testar no Firefox
- [ ] Verificar se aparece listada em `v4l2-ctl --list-devices`

**Entregável:** Câmera virtual aparece em outros apps com o fundo substituído.

---

### Fase 6 — Polimento e UX (Semana 7)

**Objetivo:** Experiência de usuário profissional.

- [ ] **Onboarding:** wizard de primeiro uso (verificar dependências, instalar módulo)
- [ ] **Verificação de dependências** na inicialização:
  - `v4l2loopback-dkms` instalado?
  - `ffmpeg` disponível no PATH?
  - Webcam detectada?
- [ ] **Tray icon:** app roda em background na bandeja do sistema
- [ ] **Indicador de status:** câmera virtual ativa/inativa
- [ ] **Configurações avançadas:**
  - Resolução de output (720p / 1080p)
  - FPS alvo
  - Device v4l2 a usar
- [ ] **Atalhos de teclado** (ligar/desligar câmera virtual)
- [ ] Animações e transições suaves na UI (Framer Motion)
- [ ] Tema escuro/claro (respeitar preferência do sistema via `prefers-color-scheme`)

---

### Fase 7 — Empacotamento e Distribuição (Semana 8)

**Objetivo:** Pacotes instaláveis para distribuições Linux.

- [ ] Configurar `electron-builder` para gerar:
  - `.deb` (Debian/Ubuntu)
  - `.AppImage` (universal)
  - `.rpm` (Fedora/openSUSE) *(opcional)*
- [ ] Script pós-instalação no `.deb` para instalar `v4l2loopback-dkms`
- [ ] Arquivo `.service` de systemd para carregar módulo no boot *(opcional)*
- [ ] Arquivo de regras `udev` para permissão de acesso sem sudo
- [ ] README com instruções de instalação manual das dependências
- [ ] Pipeline de CI/CD com GitHub Actions para build automático

---

## Estrutura de Diretórios

```
virtual-cam-app/
├── electron/
│   ├── main.ts              # Processo principal Electron
│   ├── preload.ts           # contextBridge / IPC expostos ao renderer
│   └── modules/
│       ├── v4l2Manager.ts   # Gerencia v4l2loopback (load/unload/detect)
│       ├── ffmpegPipe.ts    # Spawna e gerencia processo FFmpeg
│       └── deviceDetector.ts# Detecta webcams e devices v4l2
├── src/
│   ├── main.tsx             # Entry point React
│   ├── App.tsx
│   ├── components/
│   │   ├── CameraPreview/   # Exibe o feed processado
│   │   ├── BackgroundSelector/ # Galeria de fundos
│   │   ├── SettingsPanel/   # Configurações da câmera virtual
│   │   ├── StatusBar/       # Status da câmera virtual
│   │   └── Onboarding/      # Wizard de primeiro uso
│   ├── hooks/
│   │   ├── useWebcam.ts     # Captura e gerencia MediaStream
│   │   ├── useSegmentation.ts # Integra MediaPipe
│   │   ├── useVirtualCam.ts # Controla câmera virtual via IPC
│   │   └── useBackgrounds.ts# Gerencia fundos (CRUD + persistência)
│   ├── lib/
│   │   ├── pipeline.ts      # Orquestra o pipeline de vídeo
│   │   └── frameExporter.ts # Exporta frames do canvas para IPC
│   └── store/
│       └── settings.ts      # Estado global (Zustand)
├── assets/
│   └── backgrounds/         # Fundos pré-instalados
├── package.json
├── electron-builder.yml
├── vite.config.ts
└── tsconfig.json
```

---

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| `getUserMedia` bloqueado no Wayland puro | Alta | Implementar fallback via XDG Portal + PipeWire |
| Performance insuficiente do pipeline | Média | Usar WebGL shaders; reduzir resolução interna de segmentação |
| v4l2loopback requer kernel específico | Média | Documentar versão mínima; oferecer guia de compilação do DKMS |
| Permissão de root para modprobe | Alta | Usar polkit + regras udev; documentar alternativa com sudo |
| Latência alta no pipe de frames via IPC | Média | Usar `SharedArrayBuffer` + `Atomics`; avaliar `MessageChannel` |
| Incompatibilidade entre distros | Baixa | Testar em Ubuntu 22.04, Fedora 39 e Arch Linux |

---

## Dependências Externas do Sistema

O usuário final precisará ter instalado:

```bash
# Ubuntu/Debian
sudo apt install v4l2loopback-dkms v4l-utils ffmpeg

# Fedora
sudo dnf install v4l2loopback ffmpeg v4l-utils

# Arch Linux
sudo pacman -S v4l2loopback-dkms ffmpeg v4l-utils
```

---

## Marcos (Milestones)

| Marco | Semana | Critério de Aceite |
|---|---|---|
| M1: Projeto base | 1 | App abre no Wayland sem erros |
| M2: Webcam funcional | 2 | Preview da webcam exibido no app |
| M3: Remoção de fundo | 3 | Fundo removido em tempo real ≥ 24fps |
| M4: Troca de fundo | 4 | Usuário troca fundo e vê preview atualizado |
| M5: Câmera virtual | 6 | App aparece como câmera no Zoom/Meet |
| M6: App polido | 7 | Onboarding, tray, configurações funcionando |
| M7: Distribuição | 8 | Pacotes .deb e .AppImage gerados e instaláveis |

---

## Referências

- [Electron + Wayland](https://www.electronjs.org/docs/latest/tutorial/linux-wayland)
- [v4l2loopback GitHub](https://github.com/umlaeute/v4l2loopback)
- [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter)
- [XDG Desktop Portal](https://flatpak.github.io/xdg-desktop-portal/)
- [electron-vite](https://electron-vite.org/)
- [electron-builder](https://www.electron.build/)
