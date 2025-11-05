"""Model selection and training logic"""
import logging
import time
from typing import Dict, List, Literal, Tuple, Any
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import (
    RandomForestClassifier,
    RandomForestRegressor,
    GradientBoostingClassifier,
    GradientBoostingRegressor,
)
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso
from sklearn.svm import SVC, SVR
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    confusion_matrix,
)

try:
    from xgboost import XGBClassifier, XGBRegressor
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    logging.warning("XGBoost not available")

try:
    from lightgbm import LGBMClassifier, LGBMRegressor
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False
    logging.warning("LightGBM not available")

warnings.filterwarnings('ignore')


# Model registry
CLASSIFICATION_MODELS = {
    'logistic_regression': LogisticRegression(max_iter=1000, random_state=42),
    'random_forest': RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
    'gradient_boosting': GradientBoostingClassifier(n_estimators=100, random_state=42),
}

REGRESSION_MODELS = {
    'linear_regression': LinearRegression(),
    'ridge': Ridge(random_state=42),
    'lasso': Lasso(random_state=42),
    'random_forest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
    'gradient_boosting': GradientBoostingRegressor(n_estimators=100, random_state=42),
}

# Add XGBoost if available
if XGBOOST_AVAILABLE:
    CLASSIFICATION_MODELS['xgboost'] = XGBClassifier(
        n_estimators=100, random_state=42, n_jobs=-1, eval_metric='logloss'
    )
    REGRESSION_MODELS['xgboost'] = XGBRegressor(
        n_estimators=100, random_state=42, n_jobs=-1
    )

# Add LightGBM if available
if LIGHTGBM_AVAILABLE:
    CLASSIFICATION_MODELS['lightgbm'] = LGBMClassifier(
        n_estimators=100, random_state=42, n_jobs=-1, verbose=-1
    )
    REGRESSION_MODELS['lightgbm'] = LGBMRegressor(
        n_estimators=100, random_state=42, n_jobs=-1, verbose=-1
    )


def get_available_models(problem_type: Literal["classification", "regression"]) -> List[str]:
    """Get list of available models for problem type"""
    if problem_type == "classification":
        return list(CLASSIFICATION_MODELS.keys())
    else:
        return list(REGRESSION_MODELS.keys())


def prepare_data_for_training(
    df: pd.DataFrame,
    target_column: str,
    test_size: float = 0.2,
    random_state: int = 42,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Prepare data for training by splitting first, then encoding to prevent data leakage.
    
    Returns:
        X_train, X_test, y_train, y_test
    """
    # Separate features and target
    X = df.drop(columns=[target_column])
    y = df[target_column]
    
    # Handle any remaining nulls in target
    valid_indices = ~y.isnull()
    X = X[valid_indices]
    y = y[valid_indices]
    
    # ⚠️ IMPORTANT: Split data BEFORE encoding to prevent data leakage
    # Stratify only if we have enough samples per class
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, 
            stratify=y if len(y.unique()) < 10 and len(y) >= 20 else None
        )
    except ValueError:
        # If stratification fails (e.g., too few samples), do regular split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )
    
    logging.info(f"📊 Data split: {len(X_train)} train samples, {len(X_test)} test samples")
    
    # Log warning if dataset is very small
    total_samples = len(X)
    if total_samples < 100:
        logging.warning(f"⚠️ Very small dataset ({total_samples} samples). Results may not be reliable.")
    if len(X_test) < 20:
        logging.warning(f"⚠️ Very small test set ({len(X_test)} samples). Consider using cross-validation.")
    
    # Now encode categorical columns AFTER splitting
    categorical_columns = X_train.select_dtypes(include=['object', 'category']).columns.tolist()
    
    if categorical_columns:
        logging.info(f"🔤 Encoding {len(categorical_columns)} categorical columns: {categorical_columns}")
        
        from sklearn.preprocessing import LabelEncoder
        
        # Store encoders to apply same transformation to test set
        encoders = {}
        
        for col in categorical_columns:
            le = LabelEncoder()
            
            # Handle nulls in training data
            X_train[col] = X_train[col].fillna('missing')
            
            # Fit encoder on TRAINING data only
            X_train[col] = le.fit_transform(X_train[col].astype(str))
            encoders[col] = le
            
            # Transform TEST data using the same encoder
            X_test[col] = X_test[col].fillna('missing')
            
            # Handle unseen categories in test set
            test_values = X_test[col].astype(str)
            X_test[col] = test_values.apply(
                lambda x: le.transform([x])[0] if x in le.classes_ else -1
            )
        
        logging.info(f"✅ Categorical encoding complete (fit on train, transformed on test)")
    
    return X_train, X_test, y_train, y_test


def train_single_model(
    model_name: str,
    model,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
    problem_type: Literal["classification", "regression"],
) -> Dict[str, Any]:
    """
    Train a single model and return results with metrics.
    
    Returns:
        Dictionary with model info, metrics, timing, and visualization data
    """
    logging.info(f"🚀 Training {model_name}...")
    start_time = time.time()
    
    try:
        # Train model
        model.fit(X_train, y_train)
        
        # Make predictions
        y_pred = model.predict(X_test)
        
        # Calculate metrics and get visualization data
        if problem_type == "classification":
            metrics, viz_data = _calculate_classification_metrics(y_test, y_pred, model, X_test)
        else:
            metrics, viz_data = _calculate_regression_metrics(y_test, y_pred)
        
        # Get feature importance if available
        feature_importance = _extract_feature_importance(model, X_train.columns)
        if feature_importance:
            viz_data['feature_importance'] = feature_importance
        
        training_time = time.time() - start_time
        
        logging.info(f"✅ {model_name} completed in {training_time:.2f}s")
        
        return {
            'model_name': model_name,
            'model_type': type(model).__name__,
            'model_object': model,  # Trained model
            'problem_type': problem_type,
            'metrics': metrics,
            'training_time': training_time,
            'success': True,
            'visualization_data': viz_data,  # NEW: Visualization data
        }
        
    except Exception as e:
        training_time = time.time() - start_time
        logging.error(f"❌ {model_name} failed: {str(e)}")
        return {
            'model_name': model_name,
            'model_type': type(model).__name__,
            'model_object': None,
            'problem_type': problem_type,
            'metrics': {},
            'training_time': training_time,
            'success': False,
            'error': str(e),
        }


def _calculate_classification_metrics(y_test, y_pred, model, X_test) -> Tuple[Dict[str, float], Dict[str, Any]]:
    """Calculate classification metrics and visualization data"""
    metrics = {
        'accuracy': float(accuracy_score(y_test, y_pred)),
    }
    
    # Visualization data
    viz_data = {}
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    viz_data['confusion_matrix'] = cm.tolist()
    
    # Determine if binary or multi-class
    unique_classes = np.unique(np.concatenate([y_test, y_pred]))
    n_classes = len(unique_classes)
    
    # Calculate precision, recall, f1 - always use weighted for consistency
    try:
        if n_classes == 2:
            # For binary, calculate both binary and weighted
            metrics['precision'] = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
            metrics['recall'] = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
            metrics['f1_score'] = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
        else:
            # For multi-class, use weighted
            metrics['precision'] = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
            metrics['recall'] = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
            metrics['f1_score'] = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
        
        logging.info(f"📊 Metrics - Precision: {metrics['precision']:.4f}, Recall: {metrics['recall']:.4f}, F1: {metrics['f1_score']:.4f}")
    except Exception as e:
        logging.error(f"❌ Could not calculate precision/recall/f1: {e}")
        metrics['precision'] = 0.0
        metrics['recall'] = 0.0
        metrics['f1_score'] = 0.0
    
    # ROC-AUC (only for binary classification with predict_proba)
    if n_classes == 2 and hasattr(model, 'predict_proba'):
        try:
            y_proba = model.predict_proba(X_test)[:, 1]
            metrics['roc_auc'] = float(roc_auc_score(y_test, y_proba))
            logging.info(f"📈 ROC-AUC: {metrics['roc_auc']:.4f}")
        except Exception as e:
            logging.warning(f"Could not calculate ROC-AUC: {e}")
    
    return metrics, viz_data


def _calculate_regression_metrics(y_test, y_pred) -> Tuple[Dict[str, float], Dict[str, Any]]:
    """Calculate regression metrics and visualization data"""
    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    # Adjusted R²
    n = len(y_test)
    p = 1  # Simplified: assume 1 predictor for adjusted R²
    adjusted_r2 = 1 - (1 - r2) * (n - 1) / (n - p - 1) if n > p + 1 else r2
    
    metrics = {
        'mae': float(mae),
        'mse': float(mse),
        'rmse': float(rmse),
        'r2_score': float(r2),
        'adjusted_r2': float(adjusted_r2),
    }
    
    # Visualization data
    viz_data = {}
    
    # Residuals (limit to 1000 samples to avoid large data transfer)
    residuals = (y_test - y_pred).tolist()
    viz_data['residuals'] = residuals[:1000] if len(residuals) > 1000 else residuals
    
    return metrics, viz_data


def _extract_feature_importance(model, feature_names) -> List[Dict[str, Any]]:
    """Extract feature importance from model if available"""
    try:
        # Check if model has feature_importances_
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            
            # Create list of (feature, importance) tuples
            feature_importance = [
                {'feature': str(feature_names[i]), 'importance': float(importances[i])}
                for i in range(len(feature_names))
            ]
            
            # Sort by importance (descending)
            feature_importance.sort(key=lambda x: x['importance'], reverse=True)
            
            return feature_importance
        
        # For linear models, use coefficients
        elif hasattr(model, 'coef_'):
            coef = model.coef_
            
            # Handle multi-class case (multiple coefficients)
            if len(coef.shape) > 1:
                coef = np.abs(coef).mean(axis=0)
            else:
                coef = np.abs(coef)
            
            feature_importance = [
                {'feature': str(feature_names[i]), 'importance': float(coef[i])}
                for i in range(len(feature_names))
            ]
            
            # Sort by importance (descending)
            feature_importance.sort(key=lambda x: x['importance'], reverse=True)
            
            return feature_importance
        
        else:
            return []
            
    except Exception as e:
        logging.warning(f"Could not extract feature importance: {e}")
        return []


def select_best_model(
    trained_models: List[Dict[str, Any]], 
    problem_type: Literal["classification", "regression"]
) -> Dict[str, Any]:
    """
    Select best model based on primary metric.
    
    Classification: Best accuracy
    Regression: Best R² score
    """
    successful_models = [m for m in trained_models if m.get('success', False)]
    
    if not successful_models:
        raise ValueError("No models trained successfully")
    
    if problem_type == "classification":
        # Sort by accuracy (descending)
        best_model = max(successful_models, key=lambda m: m['metrics'].get('accuracy', 0))
        metric_used = 'accuracy'
        metric_value = best_model['metrics'].get('accuracy', 0)
        
        # ⚠️ Check for suspiciously high accuracy (potential overfitting/leakage)
        if metric_value >= 0.99:
            warning_msg = (
                "⚠️ WARNING: Suspiciously high accuracy (≥99%). "
                "This may indicate: 1) Data leakage, 2) Target in features, "
                "3) Overfitting on small dataset, or 4) Too simple dataset"
            )
            logging.warning(warning_msg)
            best_model['warnings'] = [warning_msg]
        
    else:
        # Sort by R² (descending)
        best_model = max(successful_models, key=lambda m: m['metrics'].get('r2_score', -999))
        metric_used = 'r2_score'
        metric_value = best_model['metrics'].get('r2_score', 0)
        
        # ⚠️ Check for suspiciously high R² (potential overfitting/leakage)
        if metric_value >= 0.99:
            warning_msg = (
                "⚠️ WARNING: Suspiciously high R² (≥0.99). "
                "This may indicate: 1) Data leakage, 2) Target in features, "
                "3) Overfitting on small dataset, or 4) Perfect linear relationship"
            )
            logging.warning(warning_msg)
            best_model['warnings'] = [warning_msg]
    
    logging.info(
        f"🏆 Best model: {best_model['model_name']} "
        f"({metric_used}={metric_value:.4f})"
    )
    
    return best_model
