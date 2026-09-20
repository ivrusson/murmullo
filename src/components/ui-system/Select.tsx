import { Check, ChevronDown } from 'lucide-react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import * as stylex from '@stylexjs/stylex';
import { color, radius, space, motion, shadow } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  trigger: {
    width: '100%',
    height: 36,
    paddingInline: space.md,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: {
      default: color.line,
      ':focus': color.iris,
    },
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    color: color.ink,
    fontSize: 13,
    transitionProperty: 'border-color, box-shadow',
    transitionDuration: motion.fast,
    outline: 'none',
    cursor: 'pointer',
    boxShadow: {
      default: 'none',
      ':focus': '0 0 0 2px rgba(138, 127, 214, 0.25)',
    },
  },
  value: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    flex: '1',
  },
  icon: {
    display: 'flex',
    flexShrink: 0,
    opacity: 0.6,
  },
  positioner: {
    zIndex: 50,
    outline: 'none',
  },
  popup: {
    minWidth: 'var(--anchor-width)',
    maxHeight: 280,
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
  itemText: {
    flex: '1',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  indicator: {
    display: 'flex',
    width: 14,
    height: 14,
    flexShrink: 0,
    color: color.iris,
  },
});

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function Select({
  value,
  onValueChange,
  items,
  placeholder,
  disabled = false,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  items: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const trigger = sx(styles.trigger);
  const valueSx = sx(styles.value);
  const icon = sx(styles.icon);
  const positioner = sx(styles.positioner);
  const popup = sx(styles.popup);
  const itemText = sx(styles.itemText);
  const indicator = sx(styles.indicator);

  return (
    <SelectPrimitive.Root
      items={items}
      value={value || null}
      onValueChange={next => onValueChange?.(next ?? '')}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={trigger.className}
        style={trigger.style}
      >
        <SelectPrimitive.Value
          placeholder={placeholder}
          className={valueSx.className}
          style={valueSx.style}
        />
        <SelectPrimitive.Icon className={icon.className} style={icon.style}>
          <ChevronDown size={16} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={4}
          className={positioner.className}
          style={positioner.style}
        >
          <SelectPrimitive.Popup
            className={popup.className}
            style={popup.style}
          >
            <SelectPrimitive.List>
              {items.map(item => (
                <SelectPrimitive.Item
                  key={item.value}
                  value={item.value}
                  disabled={item.disabled}
                  label={item.label}
                  className={state =>
                    sx(styles.item, state.highlighted && styles.itemHighlighted)
                      .className
                  }
                  style={state =>
                    sx(styles.item, state.highlighted && styles.itemHighlighted)
                      .style
                  }
                >
                  <SelectPrimitive.ItemText
                    className={itemText.className}
                    style={itemText.style}
                  >
                    {item.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator
                    className={indicator.className}
                    style={indicator.style}
                  >
                    <Check size={14} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/** @deprecated Use `Select`. */
export const NativeSelect = Select;
