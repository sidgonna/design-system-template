// expect: no errors — TypeScript generics and type arguments are not JSX tags (lint.mjs jsxOpenTags)
// @ts-nocheck — a lint fixture, not app code: an app's tsconfig that includes **/*.tsx must not type-check it.
import { useState, type ReactNode } from 'react';
import { Button } from 'design-system/components/react';

type Row<T> = { id: string; value: T };
export function useList<T extends object>(initial: Array<Row<T>> = []) {
  const [rows, setRows] = useState<Row<T>[]>(initial);
  const byId = new Map<string, Row<T>>(rows.map((r) => [r.id, r]));
  const add = <U,>(row: Row<T>, _extra?: U) => setRows((r) => [...r, row]);
  return { rows, byId, add, ok: rows.length < 10 && rows.length > 0 };
}
export function List<T>({ items, render }: { items: T[]; render: (t: T) => ReactNode }) {
  const empty = items.length < 1;
  return (
    <section>
      {items.map((i) => render(i))}
      <Button variant="secondary" disabled={empty}>Clear</Button>
    </section>
  );
}
