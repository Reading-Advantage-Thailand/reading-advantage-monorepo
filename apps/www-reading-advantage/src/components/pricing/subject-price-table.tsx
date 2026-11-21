/** Props for the school subject price table. */
type SubjectPriceTableProps = {
  caption: string;
  columns: string[];
  columnsLabel: string;
  rowLabels: string[];
  rows: string[][];
};

/**
 * Renders the school subject price table with a caption and labelled cells.
 * The screen-reader summary repeats the column and row copy as one line each.
 * @param props The caption, column and row copy, and screen-reader summary.
 * @returns The rendered price table.
 */
export function SubjectPriceTable({
  caption,
  columns,
  columnsLabel,
  rowLabels,
  rows,
}: SubjectPriceTableProps) {
  return (
    <div>
      <div className="sr-only">
        <span>{columnsLabel}</span>
        {rowLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <table
        data-testid="subject-price-table"
        className="w-full border-collapse text-left text-sm md:text-base"
      >
        <caption className="mb-6 text-base leading-relaxed text-site-body">
          {caption}
        </caption>
        <thead>
          <tr className="border-b-2 border-site-border">
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-2 py-3 align-bottom font-semibold text-slate-900 md:px-5"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, index) => (
            <tr key={rowLabels[index]} className="border-b border-site-border">
              <th
                scope="row"
                className="px-2 py-4 font-medium text-slate-900 md:px-5"
              >
                {cells[0]}
              </th>
              {cells.slice(1).map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-2 py-4 text-site-body md:px-5"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
