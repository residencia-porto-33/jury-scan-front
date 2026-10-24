import { useId } from 'react';

interface IssueFiltersProps {
  categories: readonly string[];
  categoria: string | undefined;
  onCategoriaChange: (categoria: string | undefined) => void;
}

export function IssueFilters({ categories, categoria, onCategoriaChange }: IssueFiltersProps) {
  const id = useId();
  if (categories.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Categoria
      </label>
      <select
        id={id}
        value={categoria ?? ''}
        onChange={(event) => onCategoriaChange(event.target.value || undefined)}
        className="min-h-10 max-w-full rounded-md border border-line-strong bg-surface px-2 text-sm text-fg"
      >
        <option value="">Todas as categorias</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  );
}
