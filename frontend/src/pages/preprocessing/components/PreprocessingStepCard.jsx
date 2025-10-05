import PropTypes from "prop-types";
import styles from "../Preprocessing.module.css";

export const PreprocessingStepCard = ({
  checked,
  onToggle,
  icon,
  label,
  description,
  completed,
  children,
}) => {
  const isCompleted = completed ?? checked;

  return (
    <div className={`${styles.stepCard} ${checked ? styles.stepCardActive : ""}`}>
      <label className={styles.stepCardLabel}>
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className={styles.stepCardIcon}>{icon}</span>
        <div className={styles.stepCardText}>
          <span className={styles.stepCardTitle}>{label}</span>
          {description && <span className={styles.stepCardDescription}>{description}</span>}
        </div>
        <span className={`${styles.stepCardStatus} ${isCompleted ? styles.stepCardStatusOn : ""}`}>
          {isCompleted ? "✓" : ""}
        </span>
      </label>
      {checked && <div className={styles.stepCardContent}>{children}</div>}
    </div>
  );
};

PreprocessingStepCard.propTypes = {
  checked: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  completed: PropTypes.bool,
  children: PropTypes.node,
};
