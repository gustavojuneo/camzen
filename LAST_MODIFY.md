 Solução:

  - main/index.ts: registra o protocolo app-bg:// (seguro, serve arquivos estáticos de userData/backgrounds/) e um handler IPC backgrounds:save que
  copia o arquivo para essa pasta e retorna a URL app-bg://nome-arquivo.ext
  - preload/index.ts + types.ts: expõe window.api.backgrounds.save(path)
  - BackgroundSelector.tsx: ao importar, usa file.path (disponível no Electron) para chamar o IPC, e salva a URL persistente app-bg://... no
  background asset ao invés da blob URL

  Agora os backgrounds importados sobrevivem ao reinício do app.
