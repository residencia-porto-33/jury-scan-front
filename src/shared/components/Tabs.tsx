import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

import { cx } from '../lib/cx';

export interface TabItem<Id extends string> {
  id: Id;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabsProps<Id extends string> {
  label: string;
  items: ReadonlyArray<TabItem<Id>>;
  selectedId: Id;
  onSelect: (id: Id) => void;
}

/**
 * Abas no padrão WAI-ARIA (ativação automática): setas esquerda/direita, Home e End.
 * Os painéis inativos ficam montados e ocultos para preservar o que o usuário digitou.
 */
export function Tabs<Id extends string>({ label, items, selectedId, onSelect }: TabsProps<Id>) {
  const baseId = useId();
  const tabRefs = useRef(new Map<Id, HTMLButtonElement>());

  const tabId = (id: Id) => `${baseId}-tab-${id}`;
  const panelId = (id: Id) => `${baseId}-panel-${id}`;

  function focusAndSelect(index: number) {
    const item = items[(index + items.length) % items.length];
    if (!item) return;
    onSelect(item.id);
    tabRefs.current.get(item.id)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const keyMap: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: items.length - 1,
    };
    const next = keyMap[event.key];
    if (next === undefined) return;
    event.preventDefault();
    focusAndSelect(next);
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 border-b border-line">
        {items.map((item, index) => {
          const selected = item.id === selectedId;
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) tabRefs.current.set(item.id, node);
                else tabRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              id={tabId(item.id)}
              aria-selected={selected}
              aria-controls={panelId(item.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(item.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cx(
                '-mb-px inline-flex min-h-11 items-center gap-2 rounded-t-md border border-b-2 px-4 text-sm font-medium',
                selected
                  ? 'border-line border-b-primary bg-surface text-fg'
                  : 'border-transparent text-fg-muted hover:bg-surface-muted hover:text-fg',
              )}
            >
              {item.icon ? (
                <span aria-hidden="true" className="inline-flex">
                  {item.icon}
                </span>
              ) : null}
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={panelId(item.id)}
          aria-labelledby={tabId(item.id)}
          hidden={item.id !== selectedId}
          tabIndex={0}
          className="pt-4"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
