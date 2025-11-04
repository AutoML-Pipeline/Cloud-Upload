import React from "react";
import { PreviewPanel } from "./PreviewPanel";

export default function FEResults(props) {
  // Intentionally reuse PreviewPanel for identical UI to avoid regressions
  return <PreviewPanel {...props} />;
}
