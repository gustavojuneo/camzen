import { ImagePlus, Trash2, VideoOff } from 'lucide-react'
import type { BackgroundAsset } from '../../../../shared/types'
import { NONE_BACKGROUND } from '../../../../shared/types'
import { Button } from '@renderer/components/ui/button'
import { Panel } from '@renderer/components/ui/panel'
import { cn } from '@renderer/lib/cn'

function createImportedBackground(file: File, blobUrl: string, persistedUrl: string): BackgroundAsset {
  const kind = file.type.startsWith('video/') ? 'video' : 'image'
  return {
    id: `custom-${crypto.randomUUID()}`,
    name: file.name.replace(/\.[^.]+$/, ''),
    kind,
    value: blobUrl,
    persistedUrl
  }
}

function BackgroundPreview({ background }: { background: BackgroundAsset }): React.JSX.Element {
  if (background.kind === 'none') {
    return (
      <span className="absolute inset-0 grid place-items-center bg-neutral-950">
        <VideoOff className="h-5 w-5 text-neutral-500" />
      </span>
    )
  }
  if (background.kind === 'solid') {
    return <span className="absolute inset-0" style={{ background: background.value }} />
  }
  if (background.kind === 'blur') {
    return (
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#67e8f9,transparent_32%),linear-gradient(135deg,#27272a,#111827)] blur-sm" />
    )
  }
  if (background.kind === 'image') {
    return <img src={background.value} className="absolute inset-0 h-full w-full object-cover" alt="" />
  }
  if (background.kind === 'video') {
    return (
      <video
        src={background.value}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        autoPlay
        loop
        playsInline
      />
    )
  }
  return <></>
}

export function BackgroundSelector({
  backgrounds,
  selectedId,
  onSelect,
  onAdd,
  onRemove
}: {
  backgrounds: BackgroundAsset[]
  selectedId: string
  onSelect: (id: string) => void
  onAdd: (asset: BackgroundAsset) => void
  onRemove: (id: string) => void
}): React.JSX.Element {
  const allItems = [NONE_BACKGROUND, ...backgrounds]

  return (
    <Panel className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-100">Filtros</h2>
        <Button className="relative overflow-hidden" size="sm" intent="ghost">
          <ImagePlus className="h-4 w-4" />
          Importar
          <input
            className="absolute inset-0 cursor-pointer opacity-0"
            type="file"
            accept="image/*,video/mp4,video/webm"
            onChange={async (event) => {
              const input = event.currentTarget
              const file = input.files?.[0]
              if (file) {
                const blobUrl = URL.createObjectURL(file)
                try {
                  const persistedUrl = await window.api.backgrounds.save(await file.arrayBuffer(), file.name)
                  onAdd(createImportedBackground(file, blobUrl, persistedUrl))
                } catch (err) {
                  console.warn('Failed to persist background', err)
                  onAdd(createImportedBackground(file, blobUrl, blobUrl))
                }
              }
              input.value = ''
            }}
          />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {allItems.map((background) => (
          <button
            key={background.id}
            className={cn(
              'group relative aspect-video overflow-hidden rounded-md border bg-neutral-900 text-left transition',
              selectedId === background.id ? 'border-cyan-400' : 'border-neutral-800 hover:border-neutral-600'
            )}
            onClick={() => onSelect(background.id)}
            type="button"
          >
            <BackgroundPreview background={background} />
            <span className="absolute inset-x-0 bottom-0 bg-neutral-950/80 px-2 py-1 text-xs font-medium text-neutral-100">
              {background.name}
            </span>
            {!background.builtIn ? (
              <span
                className="absolute right-1 top-1 hidden rounded bg-neutral-950/80 p-1 text-neutral-300 group-hover:block"
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove(background.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </Panel>
  )
}
