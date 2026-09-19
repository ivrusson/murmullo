import type { SVGAttributes } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color as tokens } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import type { LucideIcon } from 'lucide-react';

const styles = stylex.create({
  xs: { width: 12, height: 12 },
  sm: { width: 16, height: 16 },
  md: { width: 20, height: 20 },
  lg: { width: 24, height: 24 },
  xl: { width: 32, height: 32 },
  default: { color: tokens.ink },
  muted: { color: tokens.muted },
  primary: { color: tokens.iris },
  destructive: { color: tokens.danger },
  success: { color: tokens.sage },
});

interface IconProps extends Omit<SVGAttributes<SVGElement>, 'style' | 'color'> {
  icon: LucideIcon;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'default' | 'muted' | 'primary' | 'destructive' | 'success';
  xstyle?: StyleXStyles | false | null;
  style?: SVGAttributes<SVGElement>['style'];
}

export function Icon({
  icon: IconComponent,
  className,
  size = 'md',
  color = 'default',
  xstyle,
  style,
  ...rest
}: IconProps) {
  const x = sx(styles[size], styles[color], xstyle);

  return (
    <IconComponent
      {...rest}
      className={[x.className, className].filter(Boolean).join(' ')}
      style={{ ...x.style, ...style }}
    />
  );
}
