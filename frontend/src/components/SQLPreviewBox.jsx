import React from "react";

export default function SQLPreviewBox({ preview }) {
  if (!preview) return null;
  if (Array.isArray(preview) && preview.length === 0) return null;
  
  return (
    <div className="w-full">
      {Array.isArray(preview) && preview.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-spacing-0 bg-slate-800/95 rounded-lg text-text font-mono text-sm">
            <thead>
              <tr className="bg-slate-700/90">
                {Object.keys(preview[0]).map((col) => (
                  <th key={col} className="sticky top-0 bg-slate-700/90 border-b-2 border-slate-600 text-slate-200 font-bold p-3 text-center text-sm min-w-[120px] border-r border-slate-600">
                    {col || <span className="text-red-400">[No Name]</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-slate-800/95' : 'bg-slate-700/90'}>
                  {Object.keys(preview[0]).map(col => (
                    <td key={col} className="border-b border-slate-600 p-3 text-slate-100 text-center text-sm min-w-[120px] border-r border-slate-600 truncate">
                      {row[col] !== null && row[col] !== undefined && row[col] !== '' ? String(row[col]) : <span className="text-red-400">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <pre className="m-0 overflow-auto w-full text-sm">{JSON.stringify(preview, null, 2)}</pre>
      )}
    </div>
  );
}
