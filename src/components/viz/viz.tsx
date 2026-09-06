/**
 * Accessible figure wrapper shared by every chart primitive
 * (docs/research/dashboard-charts.md D3): a <figure> whose graphic is
 * `role="img"` with a short label, and a visually-hidden data table that IS
 * the alternative — ARIA inside SVG is unreliable, a table never is.
 */

import React from 'react';

export function VizTable({ caption, head, rows }: { caption: string; head: string[]; rows: Array<Array<string | number>> }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) =>
              j === 0 ? (
                <th key={j} scope="row">
                  {c}
                </th>
              ) : (
                <td key={j}>{c}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Viz({ label, table, className, children }: { label: string; table: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <figure className={className ?? 'm-0'}>
      <div role="img" aria-label={label}>
        {children}
      </div>
      {table}
    </figure>
  );
}
