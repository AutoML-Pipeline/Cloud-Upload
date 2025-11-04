export async function startPipelineRun({ title, source_filename, metadata } = {}) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/pipeline/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, source_filename, metadata }),
  });
  if (!res.ok) throw new Error(`Failed to start run (${res.status})`);
  return res.json();
}

export async function getPipelineRun(runId) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/pipeline/runs/${runId}`);
  if (!res.ok) throw new Error(`Run not found (${res.status})`);
  return res.json();
}

export async function patchPipelineRun(runId, patch) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/pipeline/runs/${runId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patch }),
  });
  if (!res.ok) throw new Error(`Failed to patch run (${res.status})`);
  return res.json();
}
