import { Keyboard, Layers, RefreshCw, Shield, Zap } from 'lucide-react';
import { useAppConfig } from '../../contexts/AppConfigContext';
import { formatHotkey, hotkeyParts } from '../../lib/hotkey';
import { PipelineLogPanel } from '@/components/PipelineLog';

function StatusDot({ ready }: { ready: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {ready && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75" />
      )}
      <span
        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${ready ? 'bg-cyan' : 'bg-amber'}`}
      />
    </span>
  );
}

export function DashboardPage() {
  const {
    selectedDevice,
    audioDevices,
    selectedLanguage,
    isLoading,
    runtimeStatus,
    config,
  } = useAppConfig();
  const ready = Boolean(runtimeStatus?.dictation_ready);
  const deviceName =
    audioDevices.find(d => d.id === selectedDevice)?.name ?? 'Sin micrófono';
  const languageLabel =
    selectedLanguage === 'auto' ? 'Auto' : selectedLanguage.toUpperCase();
  const sttState = runtimeStatus?.stt_server.state ?? 'unknown';
  const llmState = runtimeStatus?.llm_server.state ?? 'idle';
  const ptt = formatHotkey(config?.hotkeys.push_to_talk);
  const pttParts = hotkeyParts(config?.hotkeys.push_to_talk);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan" />
      </div>
    );
  }

  return (
    <div className="min-h-full px-6 py-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">
            Escritorio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            El atajo y el micrófono son de sistema: funcionan con Murmullo en
            segundo plano. La píldora solo muestra el estado, abajo en la
            pantalla.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`vf-chip shadow-sm ${ready ? 'text-cyan bg-surface-4' : 'text-amber bg-surface-4'}`}
          >
            <StatusDot ready={ready} />
            {ready ? 'Parakeet listo' : 'STT no listo'}
          </span>
          <span className="vf-chip text-muted-foreground bg-surface-4">
            Overlay · {ptt}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <section className="vf-card p-5 space-y-4">
          <div className="font-mono text-[10px] text-cyan uppercase tracking-wider">
            HUD overlay
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            El dictado se controla desde una ventana flotante aislada
            (transparente, always-on-top, sin decoración). Suelta el atajo y el
            overlay pega el texto en la app activa.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Hold-to-talk</span>
            <span className="flex items-center gap-1">
              {pttParts.map(part => (
                <kbd
                  key={part}
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-4 text-foreground"
                >
                  {part}
                </kbd>
              ))}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full vf-inset w-fit">
            <span className="px-3 py-1.5 rounded-full font-mono text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-destructive mr-2" />
              1. Grabación
            </span>
            <span className="px-3 py-1.5 rounded-full font-mono text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan mr-2" />
              2. Pensando / IA
            </span>
            <span className="px-3 py-1.5 rounded-full font-mono text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-[#27c93f] mr-2" />
              3. Completado
            </span>
          </div>
        </section>

        <section className="vf-card p-5 space-y-3">
          <div className="font-mono text-[10px] text-cyan uppercase tracking-wider">
            Runtime
          </div>
          <div className="vf-inset rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Dictado</div>
              <div className="text-xs text-muted-foreground">
                nemo-speech + Parakeet Q8
              </div>
            </div>
            <span
              className={`font-mono text-[10px] uppercase ${ready ? 'text-cyan' : 'text-amber'}`}
            >
              {ready ? 'listo' : 'pendiente'}
            </span>
          </div>
          <div className="vf-inset rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Servidor STT</div>
              <div className="text-xs text-muted-foreground">
                {runtimeStatus?.stt_server.message ?? 'Sin estado'}
              </div>
            </div>
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              {sttState}
            </span>
          </div>
          <div className="vf-inset rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">LLM local</div>
              <div className="text-xs text-muted-foreground">
                {runtimeStatus?.llm_server.message ?? 'Opcional'}
                {runtimeStatus?.llm_model
                  ? ` · ${runtimeStatus.llm_model}`
                  : ''}
              </div>
            </div>
            <span
              className={`font-mono text-[10px] uppercase ${llmState === 'running' ? 'text-cyan' : llmState === 'stopped' ? 'text-amber' : 'text-muted-foreground'}`}
            >
              {llmState === 'running'
                ? 'en marcha'
                : llmState === 'stopped'
                  ? 'parado'
                  : llmState === 'missing'
                    ? 'no instalado'
                    : llmState}
            </span>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="vf-card p-5 space-y-2">
          <div className="font-mono text-[10px] text-cyan uppercase tracking-wider">
            Micrófono
          </div>
          <div className="text-sm font-medium truncate">{deviceName}</div>
          <p className="text-xs text-muted-foreground">
            Cámbialo en Configuración. El overlay usa este dispositivo al pulsar
            el atajo.
          </p>
        </section>
        <section className="vf-card p-5 space-y-2">
          <div className="font-mono text-[10px] text-cyan uppercase tracking-wider">
            Idioma
          </div>
          <div className="text-sm font-medium">{languageLabel}</div>
          <p className="text-xs text-muted-foreground">
            Auto detecta el idioma del clip. El diccionario se aplica después
            del STT.
          </p>
        </section>
        <section className="vf-card p-5 space-y-2">
          <div className="font-mono text-[10px] text-cyan uppercase tracking-wider">
            Atajo global
          </div>
          <div className="text-sm font-medium font-mono">{ptt}</div>
          <p className="text-xs text-muted-foreground">
            Hold-to-talk. El HUD overlay muestra REC / IA / listo; aquí solo ves
            el estado del sistema.
          </p>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Zap,
            title: 'Resonancia táctil',
            body: 'HUD píldora en ventana aislada: waveform cian/ámbar y estados de grabación, procesado y pegado.',
          },
          {
            icon: Keyboard,
            title: 'Inyección zero-clipboard',
            body: 'Suelta el atajo y el texto entra en el cursor activo de cualquier ventana.',
          },
          {
            icon: Shield,
            title: 'Aislamiento local',
            body: 'STT y diccionario en el dispositivo. Nada sale a la nube.',
          },
        ].map(card => (
          <div key={card.title} className="vf-card p-5">
            <card.icon size={18} className="text-primary mb-3" />
            <h3 className="text-sm font-semibold mb-1">{card.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {card.body}
            </p>
          </div>
        ))}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Layers size={14} className="text-cyan" />
        Si no ves la píldora, mira el borde inferior de la pantalla: es otra
        ventana, no un widget del escritorio.
      </p>

      <PipelineLogPanel compact />
    </div>
  );
}
