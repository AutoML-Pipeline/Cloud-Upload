import React from "react";

export default function SQLPreviewBox({ preview }) {
  if (!preview) return null;
  if (Array.isArray(preview) && preview.length === 0) return null;
  return (
    <div
      style={{
        marginTop: 18,
        borderRadius: 14,
        background: 'rgba(30,41,59,0.97)',
        fontSize: 15,
        maxHeight: 420,
        minHeight: 120,
        overflow: 'auto',
        padding: 16,
        boxShadow: '0 2px 18px #232b3890',
        width: '98vw',
        maxWidth: 1600,
        marginLeft: 'auto',
        marginRight: 'auto',
        border: '2px solid #334155',
      }}
    >
      {Array.isArray(preview) && preview.length > 0 ? (
        <div style={{ overflow: 'auto', width: '100%' }}>
          <table style={{ width: '100%', minWidth: 1100, borderCollapse: 'separate', borderSpacing: 0, background: 'rgba(30,41,59,0.97)', borderRadius: 12, color: '#e0e7ef', fontFamily: 'Inter, Arial, sans-serif', boxShadow: '0 2px 12px #0002', border: '1.5px solid #334155' }}>
            <thead>
              <tr style={{ background: 'rgba(51,65,85,0.97)' }}>
                {Object.keys(preview[0]).map((col, idx) => (
                  <th key={col}
                      style={{ position: 'sticky', top: 0, background: 'rgba(51,65,85,0.97)', borderBottom: '2px solid #475569', color: '#cbd5e1', fontWeight: 700, padding: '12px 18px', textAlign: 'center', zIndex: 2, fontSize: 15, minWidth: 160, borderRight: '1.5px solid #334155' }}>
                    {col || <span style={{ color: '#e11d48' }}>[No Name]</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(30,41,59,0.97)' : 'rgba(51,65,85,0.93)' }}>
                  {Object.keys(preview[0]).map(col => (
                    <td key={col}
                        style={{ borderBottom: '1.5px solid #334155', padding: '10px 18px', color: '#f1f5f9', fontWeight: 500, background: 'transparent', fontFamily: 'monospace', fontSize: 15, textAlign: 'center', minWidth: 160, borderRight: '1.5px solid #334155', overflow: 'auto', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row[col] !== null && row[col] !== undefined && row[col] !== '' ? String(row[col]) : <span style={{ color: '#e11d48' }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <pre style={{ margin: 0, overflow: 'auto', width: '100%' }}>{JSON.stringify(preview, null, 2)}</pre>
      )}
    </div>
  );
}
