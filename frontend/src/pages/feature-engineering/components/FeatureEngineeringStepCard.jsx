import PropTypes from "prop-types";
import styles from "../../preprocessing/Preprocessing.module.css";

export const FeatureEngineeringStepCard = ({ checked, onToggle, icon, label, description, children }) => (
  <div className={styles.stepCard}>
    <label className={styles.stepCardLabel}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className={styles.stepCardIcon}>{icon}</span>
      <span className={styles.stepCardTitle}>{label}</span>
    </label>
    {description && <p className={styles.stepCardDescription}>{description}</p>}
    {checked && <div className={styles.stepCardContent}>{children}</div>}
  </div>
);

FeatureEngineeringStepCard.propTypes = {
  checked: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node,
};
