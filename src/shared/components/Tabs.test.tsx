import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Tabs } from './Tabs';

function Harness() {
  const [selected, setSelected] = useState<'a' | 'b' | 'c'>('a');
  return (
    <Tabs
      label="Exemplo"
      selectedId={selected}
      onSelect={setSelected}
      items={[
        { id: 'a', label: 'Primeira', content: <p>Painel A</p> },
        { id: 'b', label: 'Segunda', content: <p>Painel B</p> },
        { id: 'c', label: 'Terceira', content: <p>Painel C</p> },
      ]}
    />
  );
}

describe('Tabs', () => {
  it('segue o padrão WAI-ARIA com navegação por setas, Home e End', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const first = screen.getByRole('tab', { name: 'Primeira' });
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Primeira' })).toHaveTextContent('Painel A');

    await user.click(first);
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Segunda' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Segunda' })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Terceira' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(first).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Terceira' })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(first).toHaveFocus();
  });

  it('só a aba selecionada fica na ordem de tabulação', () => {
    render(<Harness />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
  });
});
