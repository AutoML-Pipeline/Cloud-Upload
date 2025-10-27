/**
 * Component Primitives Index
 * 
 * Central export point for all component primitive modules.
 * Import component styles like:
 * 
 * import { buttons, cards, inputs } from '@/styles/components';
 * 
 * Then use:
 * <button className={buttons.btnPrimary}>Click me</button>
 */

export { default as buttons } from './buttons.module.css';
export { default as cards } from './cards.module.css';
export { default as inputs } from './inputs.module.css';
export { default as badges } from './badges.module.css';
export { default as alerts } from './alerts.module.css';
export { default as modals } from './modals.module.css';
export { default as tooltips } from './tooltips.module.css';
export { default as loading } from './loading.module.css';
export { default as utilities } from './utilities.module.css';

/**
 * Usage Examples:
 * 
 * // Buttons
 * import { buttons } from '@/styles/components';
 * <button className={buttons.btnPrimary}>Primary</button>
 * <button className={`${buttons.btn} ${buttons.btnSecondary} ${buttons.btnLg}`}>Large Secondary</button>
 * 
 * // Cards
 * import { cards } from '@/styles/components';
 * <div className={cards.card}>
 *   <div className={cards.cardHeader}>Header</div>
 *   <div className={cards.cardBody}>Body content</div>
 * </div>
 * 
 * // Inputs
 * import { inputs } from '@/styles/components';
 * <input type="text" className={inputs.input} />
 * <div className={inputs.formField}>
 *   <label className={inputs.formLabel}>Name</label>
 *   <input className={inputs.input} />
 * </div>
 * 
 * // Badges
 * import { badges } from '@/styles/components';
 * <span className={badges.badgePrimary}>New</span>
 * <span className={`${badges.badge} ${badges.badgeSuccessSolid}`}>Active</span>
 * 
 * // Alerts
 * import { alerts } from '@/styles/components';
 * <div className={alerts.alertSuccess}>
 *   <div className={alerts.alertIcon}>✓</div>
 *   <div className={alerts.alertContent}>
 *     <div className={alerts.alertTitle}>Success!</div>
 *     <div className={alerts.alertDescription}>Operation completed.</div>
 *   </div>
 * </div>
 * 
 * // Loading
 * import { loading } from '@/styles/components';
 * <div className={loading.spinner} />
 * <div className={loading.progress}>
 *   <div className={loading.progressBar} style={{width: '60%'}} />
 * </div>
 * 
 * // Utilities
 * import { utilities } from '@/styles/components';
 * <div className={utilities.flexBetween}>
 *   <span>Left</span>
 *   <span>Right</span>
 * </div>
 */
