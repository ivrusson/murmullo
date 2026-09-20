import { Check, ChevronsUpDown } from 'lucide-react';
import { Combobox } from '@base-ui/react/combobox';
import * as stylex from '@stylexjs/stylex';
import { color, motion, radius, shadow } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { t } from '@/i18n';

const styles = stylex.create({
  group: {
    position: 'relative',
    display: 'flex',
    width: '100%',
    height: 36,
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: {
      default: color.line,
      ':focus-within': color.iris,
    },
    backgroundColor: color.surface,
    boxShadow: {
      default: 'none',
      ':focus-within': '0 0 0 2px rgba(138, 127, 214, 0.25)',
    },
  },
  input: {
    height: '100%',
    width: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingLeft: 14,
    paddingRight: 36,
    fontSize: 13,
    color: {
      default: color.ink,
      '::placeholder': color.muted,
    },
    outline: 'none',
  },
  trigger: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: '100%',
    width: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: color.muted,
    cursor: 'pointer',
  },
  popup: {
    width: 'var(--anchor-width)',
    maxHeight: 300,
    overflowY: 'auto',
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.line,
    backgroundColor: color.surface,
    color: color.ink,
    boxShadow: shadow.hud,
    padding: 4,
    outline: 'none',
    zIndex: 50,
  },
  empty: {
    paddingBlock: 16,
    textAlign: 'center',
    fontSize: 13,
    color: color.muted,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderRadius: 4,
    paddingInline: 8,
    paddingBlock: 6,
    fontSize: 13,
    outline: 'none',
    cursor: 'default',
    userSelect: 'none',
    backgroundColor: 'transparent',
  },
  itemHighlighted: {
    backgroundColor: color.raised,
  },
  checkIcon: {
    height: 14,
    width: 14,
    flexShrink: 0,
    color: color.iris,
  },
  checkHidden: {
    opacity: 0,
  },
  checkSlot: {
    width: 14,
    height: 14,
    flexShrink: 0,
  },
  label: {
    flex: '1',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chevron: {
    opacity: 0.5,
    flexShrink: 0,
    transitionProperty: 'transform',
    transitionDuration: motion.fast,
  },
});

export interface ComboBoxProps {
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
}

type ComboOption = ComboBoxProps['options'][number];

export function ComboBox({
  options,
  value,
  onValueChange,
  placeholder = t('common.selectOption'),
  searchPlaceholder = t('common.search'),
  emptyText = t('common.noOption'),
  disabled = false,
}: ComboBoxProps) {
  const selected = options.find(option => option.value === value) ?? null;
  const group = sx(styles.group);
  const input = sx(styles.input);
  const trigger = sx(styles.trigger);
  const popup = sx(styles.popup);
  const empty = sx(styles.empty);
  const checkSlot = sx(styles.checkSlot);
  const label = sx(styles.label);
  const chevron = sx(styles.chevron);

  return (
    <Combobox.Root
      items={options}
      value={selected}
      onValueChange={next => onValueChange?.(next?.value ?? '')}
      itemToStringLabel={item => item.label}
      itemToStringValue={item => item.value}
      isItemEqualToValue={(a, b) => a.value === b.value}
      disabled={disabled}
    >
      <Combobox.InputGroup className={group.className} style={group.style}>
        <Combobox.Input
          placeholder={
            selected ? selected.label : searchPlaceholder || placeholder
          }
          className={input.className}
          style={input.style}
        />
        <Combobox.Trigger
          className={trigger.className}
          style={trigger.style}
          aria-label={t('common.openPopup')}
        >
          <ChevronsUpDown
            size={14}
            className={chevron.className}
            style={chevron.style}
          />
        </Combobox.Trigger>
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4}>
          <Combobox.Popup className={popup.className} style={popup.style}>
            <Combobox.Empty className={empty.className} style={empty.style}>
              {emptyText}
            </Combobox.Empty>
            <Combobox.List>
              {(item: ComboOption) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  disabled={item.disabled}
                  className={state =>
                    sx(styles.item, state.highlighted && styles.itemHighlighted)
                      .className
                  }
                  style={state =>
                    sx(styles.item, state.highlighted && styles.itemHighlighted)
                      .style
                  }
                >
                  <span className={checkSlot.className} style={checkSlot.style}>
                    <Combobox.ItemIndicator
                      keepMounted
                      className={state =>
                        sx(
                          styles.checkIcon,
                          !state.selected && styles.checkHidden
                        ).className
                      }
                      style={state =>
                        sx(
                          styles.checkIcon,
                          !state.selected && styles.checkHidden
                        ).style
                      }
                    >
                      <Check size={14} />
                    </Combobox.ItemIndicator>
                  </span>
                  <span className={label.className} style={label.style}>
                    {item.label}
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
