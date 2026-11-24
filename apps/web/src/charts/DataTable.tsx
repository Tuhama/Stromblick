import { useId } from "react";
import { useTranslation } from "react-i18next";
import { formatClock } from "../time/berlin";

export interface DataTableRow {
  /** The moment of the row, in milliseconds since the epoch. */
  time: number;
  /** One number per column; null where that column has no reading at this time. */
  values: readonly (number | null)[];
}

interface DataTableProps {
  /** What the table lists, for screen readers and as its visible heading. */
  caption: string;
  /** The column names after the time column, in the order of each row's values. */
  columns: readonly string[];
  rows: readonly DataTableRow[];
  /** Writes a number in the reader's language. */
  formatValue: (value: number) => string;
  /** Writes the time of a row. The clock time by default: right for a table of one day. */
  formatTime?: (time: number) => string;
}

/**
 * The numbers behind a chart, as a table: a chart's canvas can't be read or tabbed through, a table
 * can. Closed by default, so a day of quarter-hours doesn't push the page down.
 */
export function DataTable({
  caption,
  columns,
  rows,
  formatValue,
  formatTime = formatClock,
}: DataTableProps) {
  const { t } = useTranslation();
  const captionId = useId();

  return (
    <details className="mt-4">
      <summary className="w-fit cursor-pointer rounded-md text-sm underline underline-offset-4">
        {t("chart.table.show")}
      </summary>
      {/* Focusable, so a keyboard can scroll it: a table taller or wider than its box scrolls. */}
      <div
        role="region"
        aria-labelledby={captionId}
        tabIndex={0}
        className="mt-2 max-h-80 overflow-auto rounded-md border border-border"
      >
        <table className="w-full border-collapse text-sm">
          <caption id={captionId} className="px-3 py-2 text-left font-medium">
            {caption}
          </caption>
          <thead className="sticky top-0 bg-muted">
            <tr>
              <th scope="col" className="px-3 py-1.5 text-left font-medium">
                {t("chart.table.time")}
              </th>
              {columns.map((column) => (
                <th key={column} scope="col" className="px-3 py-1.5 text-right font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.time} className="border-t border-border">
                <th scope="row" className="px-3 py-1 text-left font-normal tabular-nums">
                  {formatTime(row.time)}
                </th>
                {row.values.map((value, index) => (
                  <td key={columns[index]} className="px-3 py-1 text-right tabular-nums">
                    {value === null ? (
                      <span className="text-muted-foreground">
                        <span aria-hidden="true">–</span>
                        <span className="sr-only">{t("chart.table.missing")}</span>
                      </span>
                    ) : (
                      formatValue(value)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
