import PropTypes from "prop-types";
import styles from "../../preprocessing/Preprocessing.module.css";

const RECOMMENDATION_COLORS = {
  critical: "#d32f2f", // Red
  warning: "#f57c00", // Orange
  info: "#1976d2", // Blue
  success: "#388e3c", // Green
};

export const RecommendationPanel = ({ recommendations, dataQualityNotes }) => {
  if (!recommendations && !dataQualityNotes) {
    return null;
  }

  return (
    <div
      className={styles.warningBox}
      style={{
        backgroundColor: "#f5f5f5",
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "20px",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "12px", color: "#333" }}>
        📋 Smart Recommendations
      </h3>

      {/* Data Quality Notes */}
      {dataQualityNotes && dataQualityNotes.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <h4 style={{ marginTop: 0, marginBottom: "8px", fontSize: "14px", color: "#666" }}>
            Data Quality Assessment
          </h4>
          <ul style={{ margin: "0", paddingLeft: "20px" }}>
            {dataQualityNotes.map((note, idx) => (
              <li
                key={idx}
                style={{
                  marginBottom: "6px",
                  fontSize: "13px",
                  lineHeight: "1.4",
                  color: note.includes("⚠️") ? "#f57c00" : note.includes("🆔") ? "#d32f2f" : "#388e3c",
                }}
              >
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Step Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div>
          <h4 style={{ marginTop: 0, marginBottom: "8px", fontSize: "14px", color: "#666" }}>
            Recommended Steps
          </h4>
          <div style={{ display: "grid", gap: "8px" }}>
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#fff",
                  border: rec.step_type === "encoding" && rec.step_name.includes("High-Cardinality")
                    ? "2px solid #d32f2f"
                    : "1px solid #ddd",
                  borderRadius: "6px",
                  padding: "10px",
                  fontSize: "12px",
                }}
              >
                <div style={{ fontWeight: "600", marginBottom: "4px", color: "#333" }}>
                  {rec.step_name}
                </div>
                <div style={{ color: "#666", marginBottom: "6px", lineHeight: "1.3" }}>
                  {rec.reason}
                </div>
                <div style={{ fontSize: "11px", color: "#999" }}>
                  Columns: {rec.recommended_columns?.join(", ") || "N/A"}
                </div>
                {rec.step_type === "encoding" && rec.step_name.includes("High-Cardinality") && (
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "6px",
                      backgroundColor: "#ffebee",
                      borderRadius: "4px",
                      color: "#d32f2f",
                      fontSize: "11px",
                    }}
                  >
                    💡 <strong>TIP:</strong> Select method dropdown → choose "Label" (not "One-Hot")
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: "12px",
          paddingTop: "12px",
          borderTop: "1px solid #ddd",
          fontSize: "12px",
          color: "#999",
        }}
      >
        ℹ️ These suggestions are based on analysis of your dataset to optimize performance and avoid memory issues.
      </div>
    </div>
  );
};

RecommendationPanel.propTypes = {
  recommendations: PropTypes.arrayOf(
    PropTypes.shape({
      step_type: PropTypes.string.isRequired,
      step_name: PropTypes.string.isRequired,
      reason: PropTypes.string.isRequired,
      recommended_columns: PropTypes.arrayOf(PropTypes.string),
    })
  ),
  dataQualityNotes: PropTypes.arrayOf(PropTypes.string),
};

export default RecommendationPanel;
