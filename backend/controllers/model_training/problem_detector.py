"""Auto-detect problem type (classification vs regression)"""
import logging
from typing import Literal, Dict, Any, List
import pandas as pd
import numpy as np


def analyze_target_column(df: pd.DataFrame, target_column: str) -> Dict[str, Any]:
    """
    Analyze target column and provide detailed insights.
    
    Returns:
        Dict with target column statistics and characteristics
    """
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset")
    
    target = df[target_column]
    target_clean = target.dropna()
    
    if len(target_clean) == 0:
        raise ValueError(f"Target column '{target_column}' is entirely null")
    
    n_unique = target_clean.nunique()
    n_samples = len(target_clean)
    unique_ratio = n_unique / n_samples
    null_count = int(target.isnull().sum())
    null_pct = (null_count / len(df)) * 100
    
    is_numeric = pd.api.types.is_numeric_dtype(target)
    is_categorical = target.dtype == 'object' or target.dtype.name == 'category'
    is_boolean = target.dtype == bool or set(target_clean.unique()).issubset({0, 1, True, False})
    
    analysis = {
        "column_name": target_column,
        "dtype": str(target.dtype),
        "is_numeric": bool(is_numeric),
        "is_categorical": bool(is_categorical),
        "is_boolean": bool(is_boolean),
        "total_samples": int(n_samples),
        "unique_values": int(n_unique),
        "unique_ratio": float(unique_ratio),
        "null_count": null_count,
        "null_percentage": float(null_pct),
    }
    
    # Add numeric stats if applicable
    if is_numeric and not is_boolean:
        analysis.update({
            "min_value": float(target_clean.min()),
            "max_value": float(target_clean.max()),
            "mean_value": float(target_clean.mean()),
            "std_value": float(target_clean.std()),
            "median_value": float(target_clean.median()),
        })
    
    # Add class distribution for categorical/low-cardinality
    if is_categorical or (is_numeric and n_unique <= 20):
        value_counts = target_clean.value_counts().head(10)
        analysis["class_distribution"] = {
            str(k): int(v) for k, v in value_counts.items()
        }
    
    return analysis


def detect_problem_type(
    df: pd.DataFrame, 
    target_column: str
) -> Literal["classification", "regression"]:
    """
    Automatically detect if this is a classification or regression problem.
    
    Logic:
    1. If target is object/string type → classification
    2. If target is boolean → classification
    3. If target is float type → regression (continuous values)
    4. If target has < 5% unique values ratio → classification
    5. If target is integer with ≤10 unique values → classification
    6. If target is integer with >10 unique values → regression (continuous/ordinal)
    7. Default to regression for continuous numeric
    
    Args:
        df: DataFrame with features and target
        target_column: Name of target column
        
    Returns:
        "classification" or "regression"
    """
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset")
    
    target = df[target_column]
    
    # Remove NaN for analysis
    target_clean = target.dropna()
    
    if len(target_clean) == 0:
        raise ValueError(f"Target column '{target_column}' is entirely null")
    
    # Rule 1: String/object type → classification
    if target.dtype == 'object' or target.dtype.name == 'category':
        logging.info(f"🎯 Detected CLASSIFICATION (target is categorical/object type)")
        return "classification"
    
    # Rule 2: Boolean type → classification
    if target.dtype == bool or set(target_clean.unique()).issubset({0, 1, True, False}):
        logging.info(f"🎯 Detected CLASSIFICATION (target is boolean)")
        return "classification"
    
    # Rule 3: Check unique value ratio
    n_unique = target_clean.nunique()
    n_samples = len(target_clean)
    unique_ratio = n_unique / n_samples
    
    # Rule 3a: If float type → always regression (continuous data)
    if pd.api.types.is_float_dtype(target.dtype):
        logging.info(
            f"🎯 Detected REGRESSION (float target with {n_unique} unique values)"
        )
        return "regression"
    
    # Rule 3b: If less than 5% unique values → likely classification
    if unique_ratio < 0.05:
        logging.info(
            f"🎯 Detected CLASSIFICATION ({n_unique} unique values, "
            f"{unique_ratio:.2%} of {n_samples} samples)"
        )
        return "classification"
    
    # Rule 4: If target is integer and has reasonable number of classes (≤10 classes)
    if np.issubdtype(target.dtype, np.integer):
        if n_unique <= 10:  # Stricter threshold: only very few classes
            logging.info(
                f"🎯 Detected CLASSIFICATION (integer target with {n_unique} unique classes)"
            )
            return "classification"
        else:
            # Too many unique integers → likely continuous/ordinal (regression)
            logging.info(
                f"🎯 Detected REGRESSION (integer target with {n_unique} unique values, likely continuous)"
            )
            return "regression"
    
    # Rule 5: Default to regression for continuous numeric
    logging.info(
        f"🎯 Detected REGRESSION (continuous numeric target with {n_unique} unique values)"
    )
    return "regression"


def get_recommended_models(
    problem_type: Literal["classification", "regression"],
    n_samples: int,
    n_features: int,
    target_analysis: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Recommend which models to use based on problem characteristics.
    
    Returns:
        List of model recommendations with reasons
    """
    recommendations = []
    
    if problem_type == "classification":
        # Always recommend Logistic Regression for classification
        recommendations.append({
            "model_id": "logistic_regression",  # Matches CLASSIFICATION_MODELS key
            "model_name": "Logistic Regression",
            "reason": "Fast, interpretable baseline for classification",
            "recommended": True,
            "priority": "high"
        })
        
        # Random Forest - good for most cases
        recommendations.append({
            "model_id": "random_forest",  # Matches CLASSIFICATION_MODELS key
            "model_name": "Random Forest",
            "reason": "Robust ensemble method, handles non-linear relationships well",
            "recommended": True,
            "priority": "high"
        })
        
        # Gradient Boosting
        recommendations.append({
            "model_id": "gradient_boosting",  # Matches CLASSIFICATION_MODELS key
            "model_name": "Gradient Boosting",
            "reason": "Solid ensemble method for classification",
            "recommended": True,
            "priority": "high"
        })
        
        # XGBoost - for larger datasets
        if n_samples >= 1000:
            recommendations.append({
                "model_id": "xgboost",  # Matches CLASSIFICATION_MODELS key
                "model_name": "XGBoost",
                "reason": f"Powerful gradient boosting for large datasets ({n_samples} samples)",
                "recommended": True,
                "priority": "high"
            })
        else:
            recommendations.append({
                "model_id": "xgboost",  # Matches CLASSIFICATION_MODELS key
                "model_name": "XGBoost",
                "reason": "Good but may overfit on small datasets",
                "recommended": False,
                "priority": "medium"
            })
        
        # LightGBM - for very large datasets
        if n_samples >= 10000:
            recommendations.append({
                "model_id": "lightgbm",  # Matches CLASSIFICATION_MODELS key
                "model_name": "LightGBM",
                "reason": f"Fast training on large datasets ({n_samples} samples)",
                "recommended": True,
                "priority": "high"
            })
        else:
            recommendations.append({
                "model_id": "lightgbm",  # Matches CLASSIFICATION_MODELS key
                "model_name": "LightGBM",
                "reason": "Better suited for larger datasets",
                "recommended": False,
                "priority": "low"
            })
    
    else:  # regression
        # Always recommend Linear Regression
        recommendations.append({
            "model_id": "linear_regression",  # Matches REGRESSION_MODELS key
            "model_name": "Linear Regression",
            "reason": "Fast, interpretable baseline for regression",
            "recommended": True,
            "priority": "high"
        })
        
        # Random Forest
        recommendations.append({
            "model_id": "random_forest",  # Matches REGRESSION_MODELS key
            "model_name": "Random Forest",
            "reason": "Handles non-linear relationships and outliers well",
            "recommended": True,
            "priority": "high"
        })
        
        # Gradient Boosting
        recommendations.append({
            "model_id": "gradient_boosting",  # Matches REGRESSION_MODELS key
            "model_name": "Gradient Boosting",
            "reason": "Solid ensemble method for regression",
            "recommended": True,
            "priority": "high"
        })
        
        # XGBoost
        if n_samples >= 1000:
            recommendations.append({
                "model_id": "xgboost",  # Matches REGRESSION_MODELS key
                "model_name": "XGBoost",
                "reason": f"Powerful for large datasets ({n_samples} samples)",
                "recommended": True,
                "priority": "high"
            })
        else:
            recommendations.append({
                "model_id": "xgboost",  # Matches REGRESSION_MODELS key
                "model_name": "XGBoost",
                "reason": "May overfit on small datasets",
                "recommended": False,
                "priority": "medium"
            })
        
        # LightGBM
        if n_samples >= 10000:
            recommendations.append({
                "model_id": "lightgbm",  # Matches REGRESSION_MODELS key
                "model_name": "LightGBM",
                "reason": f"Fastest for large datasets ({n_samples} samples)",
                "recommended": True,
                "priority": "high"
            })
        else:
            recommendations.append({
                "model_id": "lightgbm",  # Matches REGRESSION_MODELS key
                "model_name": "LightGBM",
                "reason": "Better suited for larger datasets",
                "recommended": False,
                "priority": "low"
            })
        
        # Ridge Regression
        if n_features >= 20:
            recommendations.append({
                "model_id": "ridge",  # Matches REGRESSION_MODELS key
                "model_name": "Ridge Regression",
                "reason": f"Good regularization for high-dimensional data ({n_features} features)",
                "recommended": True,
                "priority": "medium"
            })
        else:
            recommendations.append({
                "model_id": "ridge",  # Matches REGRESSION_MODELS key
                "model_name": "Ridge Regression",
                "reason": "Regularized linear model",
                "recommended": False,
                "priority": "low"
            })
        
        # Lasso Regression
        if n_features >= 20:
            recommendations.append({
                "model_id": "lasso",  # Matches REGRESSION_MODELS key
                "model_name": "Lasso Regression",
                "reason": f"Feature selection through L1 regularization ({n_features} features)",
                "recommended": True,
                "priority": "medium"
            })
        else:
            recommendations.append({
                "model_id": "lasso",  # Matches REGRESSION_MODELS key
                "model_name": "Lasso Regression",
                "reason": "L1 regularized linear model",
                "recommended": False,
                "priority": "low"
            })
    
    return recommendations


def validate_target_column(df: pd.DataFrame, target_column: str) -> None:
    """
    Validate that target column is suitable for training.
    
    Raises ValueError if target is invalid.
    """
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset")
    
    target = df[target_column]
    null_count = target.isnull().sum()
    null_pct = (null_count / len(df)) * 100
    
    # Check for too many nulls
    if null_pct > 50:
        raise ValueError(
            f"Target column '{target_column}' has {null_pct:.1f}% null values. "
            "Please clean this column before training."
        )
    
    # Check for constant target
    if target.nunique() == 1:
        raise ValueError(
            f"Target column '{target_column}' has only one unique value. "
            "Cannot train a model with constant target."
        )
    
    logging.info(f"✅ Target column '{target_column}' validation passed")
