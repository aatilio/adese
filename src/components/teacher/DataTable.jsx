import React from 'react';

export default function DataTable({ headers, children, emptyMessage, isEmpty }) {
  return (
    <div className="table-responsive tp-table-container">
      <table className="table tp-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={headers.length} className="text-center text-muted py-4">
                {emptyMessage || "No hay datos"}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
