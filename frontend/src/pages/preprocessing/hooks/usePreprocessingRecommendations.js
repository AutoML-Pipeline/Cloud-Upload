import { useEffect, useState } from "react";

export function usePreprocessingRecommendations(filename) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!filename) {
      setData(null);
      return;
    }
    let abort = false;
    setLoading(true);
    setError(null);
    fetch(`http://localhost:8000/api/data/recommendations/${encodeURIComponent(filename)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (abort) return;
        if (!res.ok || json?.error) {
          throw new Error(json?.error || "Failed to load preprocessing recommendations");
        }
        setData(json);
      })
      .catch((e) => {
        if (abort) return;
        setError(e);
        setData(null);
      })
      .finally(() => !abort && setLoading(false));
    return () => {
      abort = true;
    };
  }, [filename]);

  return { data, loading, error };
}
