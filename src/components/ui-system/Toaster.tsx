import { CircleCheck, Info, OctagonX, TriangleAlert, X } from 'lucide-react';
import { Toast } from '@base-ui/react/toast';
import * as stylex from '@stylexjs/stylex';
import { color, font, radius, shadow, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { toastManager } from './toast';
import { useT } from '@/i18n';

const styles = stylex.create({
  viewport: {
    position: 'fixed',
    right: 16,
    bottom: 16,
    zIndex: 80,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: 360,
    maxWidth: 'calc(100vw - 2rem)',
    outline: 'none',
  },
  toast: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.line,
    backgroundColor: color.surface,
    color: color.ink,
    boxShadow: shadow.card,
    outline: 'none',
  },
  content: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: space.md,
  },
  copy: {
    minWidth: 0,
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  title: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 13,
    fontWeight: 600,
    color: color.ink,
  },
  description: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 12,
    color: color.muted,
    lineHeight: 1.4,
  },
  close: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: color.muted,
    cursor: 'pointer',
  },
  icon: {
    flexShrink: 0,
    marginTop: 1,
  },
});

function ToastIcon({ type }: { type?: string }) {
  const iconSx = sx(styles.icon);
  if (type === 'success') {
    return <CircleCheck size={18} color="var(--color-sage)" {...iconSx} />;
  }
  if (type === 'error') {
    return <OctagonX size={18} color="var(--color-danger)" {...iconSx} />;
  }
  if (type === 'info') {
    return <Info size={18} color="var(--color-sky)" {...iconSx} />;
  }
  if (type === 'warning') {
    return <TriangleAlert size={18} color="var(--color-iris)" {...iconSx} />;
  }
  return <Info size={18} color="var(--color-muted)" {...iconSx} />;
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  const t = useT();
  const toastSx = sx(styles.toast);
  const contentSx = sx(styles.content);
  const copySx = sx(styles.copy);
  const titleSx = sx(styles.title);
  const descriptionSx = sx(styles.description);
  const closeSx = sx(styles.close);

  return toasts.map(item => (
    <Toast.Root
      key={item.id}
      toast={item}
      className={toastSx.className}
      style={toastSx.style}
    >
      <Toast.Content className={contentSx.className} style={contentSx.style}>
        <ToastIcon type={item.type} />
        <div className={copySx.className} style={copySx.style}>
          <Toast.Title className={titleSx.className} style={titleSx.style} />
          <Toast.Description
            className={descriptionSx.className}
            style={descriptionSx.style}
          />
        </div>
        <Toast.Close
          className={closeSx.className}
          style={closeSx.style}
          aria-label={t('common.close')}
        >
          <X size={14} />
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

export function Toaster() {
  const viewport = sx(styles.viewport);
  return (
    <Toast.Provider toastManager={toastManager}>
      <Toast.Portal>
        <Toast.Viewport className={viewport.className} style={viewport.style}>
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
