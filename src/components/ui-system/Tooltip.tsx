import type { ReactNode } from 'react';

export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="murmullo-tooltip">
      {children}
      <span role="tooltip" className="murmullo-tooltip__bubble">
        {label}
      </span>
    </span>
  );
}
