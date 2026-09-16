export default function DataTable({ columns = [], rows = [], emptyText = 'No records found', mobileCards = true }) {
  const visibleCols = columns.filter((col) => !col.mobileHide)

  return (
    <>
      {mobileCards && (
        <div className="lg:hidden space-y-3">
          {rows.length === 0 ? (
            <div className="mobile-data-card text-center text-slate-400 py-8">{emptyText}</div>
          ) : (
            rows.map((row, rowIndex) => {
              const actionCol = columns.find((col) => col.mobileActions || col.key === 'actions')
              const dataCols = visibleCols.filter((col) => col !== actionCol && col.key !== 'actions')

              return (
                <div key={row.id || rowIndex} className="mobile-data-card">
                  {dataCols.map((col) => (
                    <div key={col.key} className="mobile-data-row">
                      <span className="mobile-data-label">{col.mobileLabel || col.label}</span>
                      <span className="mobile-data-value">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </span>
                    </div>
                  ))}
                  {actionCol && (
                    <div className="mobile-data-actions">
                      {actionCol.render ? actionCol.render(row[actionCol.key], row) : row[actionCol.key]}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      <div className={`table-container${mobileCards ? ' hidden lg:block' : ''}`}>
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="text-center text-slate-400 py-8">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={row.id || rowIndex}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row[col.key], row) : row[col.key]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
