import React from "react";

export default function SQLPreviewBox({ preview }) {
  if (!preview) return null;
  if (Array.isArray(preview) && preview.length === 0) return null;
  return (
    <div
      style={{
        marginTop: 18,
        borderRadius: 14,
        background: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        maxHeight: 340,
        minHeight: 80,
        overflow: 'auto',
        padding: 8,
        boxShadow: '0 2px 12px #232b3860',
        width: '100%',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      {Array.isArray(preview) && preview.length > 0 ? (
        <div style={{ overflow: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff', borderRadius: 8 }}>
            <thead>
              <tr>
                {Object.keys(preview[0]).map((col, idx) => (
                  <th key={col}
                      style={{ position: 'sticky', top: 0, background: '#f1f5fa', borderBottom: '2px solid #b6b6b6', padding: '6px 10px', color: '#222', textAlign: 'left', zIndex: 1, fontWeight: 700 }}>
                    {col || <span style={{ color: '#e11d48' }}>[No Name]</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#f7f8fa' : '#fff' }}>
                  {Object.keys(preview[0]).map(col => (
                    <td key={col}
                        style={{ borderBottom: '1px solid #eee', padding: '6px 10px', maxWidth: 180, overflow: 'auto', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#222', fontWeight: 400 }}>
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
