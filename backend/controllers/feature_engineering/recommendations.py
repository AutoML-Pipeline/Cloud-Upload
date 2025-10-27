import logging
from typing import List, Dict, Any, Tuple
import pandas as pd
import numpy as np

from .types import (
    ColumnInsight,
    StepRecommendation,
    DatasetAnalysis,
)


def analyze_column(df: pd.DataFrame, column_name: str) -> ColumnInsight:
    """Analyze a single column and return insights from FULL dataset"""
    column = df[column_name]
    dtype = str(column.dtype)
    
    # Determine column types
    is_numeric = pd.api.types.is_numeric_dtype(column)
    is_categorical = pd.api.types.is_categorical_dtype(column) or dtype == 'object'
    is_datetime = pd.api.types.is_datetime64_any_dtype(column)
    is_text = dtype == 'object' and not is_datetime
    
    # Calculate stats from FULL dataset
    missing_count = column.isna().sum()
    missing_percentage = (missing_count / len(column)) * 100 if len(column) > 0 else 0
    cardinality = column.nunique()
    
    # Numeric stats from full data
    min_value = None
    max_value = None
    mean_value = None
    std_value = None
    unique_values = None
    
    if is_numeric:
        min_value = float(column.min()) if len(column) > 0 else None
        max_value = float(column.max()) if len(column) > 0 else None
        mean_value = float(column.mean()) if len(column) > 0 else None
        std_value = float(column.std()) if len(column) > 0 else None
    elif is_categorical or is_text:
        # Get top unique values from full dataset
        top_values = column.dropna().unique()[:10].tolist()
        unique_values = [str(v) for v in top_values]
    
    return ColumnInsight(
        name=column_name,
        dtype=dtype,
        cardinality=int(cardinality),
        missing_count=int(missing_count),
        missing_percentage=float(missing_percentage),
        is_numeric=bool(is_numeric),
        is_categorical=bool(is_categorical),
        is_datetime=bool(is_datetime),
        is_text=bool(is_text),
        min_value=min_value,
        max_value=max_value,
        mean_value=mean_value,
        std_value=std_value,
        unique_values=unique_values,
    )


def get_step_recommendations(column_insights: List[ColumnInsight]) -> List[StepRecommendation]:
    """Generate step recommendations based on column insights"""
    recommendations = []
    
    # Collect columns by type
    numeric_cols = [c.name for c in column_insights if c.is_numeric]
    categorical_cols = [c.name for c in column_insights if c.is_categorical and not c.is_numeric]
    datetime_cols = [c.name for c in column_insights if c.is_datetime]
    
    # Separate categorical columns by cardinality (IMPORTANT FOR MEMORY!)
    low_card_cats = [c for c in column_insights if c.is_categorical and 5 <= c.cardinality <= 100]
    high_card_cats = [c for c in column_insights if c.is_categorical and c.cardinality > 100]
    id_cols = [c for c in column_insights if c.is_categorical and c.cardinality > len([x for x in column_insights if x.is_categorical])]
    
    # SCALING - for numeric columns with good variance
    high_variance_cols = [
        c.name for c in column_insights
        if c.is_numeric and c.std_value and c.std_value > 0
    ]
    if high_variance_cols:
        why_map = {col: "Numeric feature with variance" for col in high_variance_cols}
        recommendations.append(StepRecommendation(
            step_type="scaling",
            step_name="Scaling",
            recommended_columns=high_variance_cols,
            reason="Normalize numeric features to same scale for better model performance",
            compatibility_score=0.95,
            why_these_columns=why_map,
        ))
    
    # ENCODING - for LOW-CARDINALITY categorical columns ONLY
    low_card_names = [c.name for c in low_card_cats]
    if low_card_names:
        why_map = {
            col: f"Low-cardinality categorical feature ({next(c.cardinality for c in column_insights if c.name == col)} unique values)"
            for col in low_card_names
        }
        recommendations.append(StepRecommendation(
            step_type="encoding",
            step_name="Encoding (Low-Cardinality Columns)",
            recommended_columns=low_card_names,
            reason="Convert low-cardinality categorical variables to numerical format. ✓ Memory-safe",
            compatibility_score=0.95,
            why_these_columns=why_map,
        ))
    
    # WARNING for HIGH-CARDINALITY columns
    high_card_names = [c.name for c in high_card_cats]
    if high_card_names:
        why_map = {
            col: f"⚠️ HIGH-CARDINALITY ({next(c.cardinality for c in column_insights if c.name == col)} unique values) - Use LABEL encoding, not one-hot!"
            for col in high_card_names
        }
        recommendations.append(StepRecommendation(
            step_type="encoding",
            step_name="⚠️ Encoding (High-Cardinality - Use Label Only!)",
            recommended_columns=high_card_names,
            reason="⚠️ WARNING: These columns have MANY unique values. Use LABEL ENCODING ONLY (not one-hot) to avoid memory crash! One-hot would require 10s of GiB of RAM.",
            compatibility_score=0.60,
            why_these_columns=why_map,
        ))
    
    # BINNING - for numeric columns with wide range
    binning_cols = [
        c.name for c in column_insights
        if c.is_numeric and c.max_value and c.min_value 
        and (c.max_value - c.min_value) > 100
    ]
    if binning_cols:
        why_map = {col: "Wide range numeric feature suitable for binning" for col in binning_cols}
        recommendations.append(StepRecommendation(
            step_type="binning",
            step_name="Binning",
            recommended_columns=binning_cols,
            reason="Convert continuous numeric features into discrete bins",
            compatibility_score=0.75,
            why_these_columns=why_map,
        ))
    
    # POLYNOMIAL FEATURES - for numeric columns
    if numeric_cols:
        why_map = {col: "Numeric feature for polynomial expansion" for col in numeric_cols[:3]}
        recommendations.append(StepRecommendation(
            step_type="feature_creation",
            step_name="Polynomial Features",
            recommended_columns=numeric_cols[:3] if len(numeric_cols) > 2 else numeric_cols,
            reason="Create polynomial and interaction features for non-linear relationships",
            compatibility_score=0.80,
            why_these_columns=why_map,
        ))
    
    # DATETIME DECOMPOSITION - for datetime columns
    if datetime_cols:
        why_map = {col: "DateTime feature for decomposition" for col in datetime_cols}
        recommendations.append(StepRecommendation(
            step_type="feature_creation",
            step_name="DateTime Decomposition",
            recommended_columns=datetime_cols,
            reason="Extract temporal patterns (year, month, day, etc.) from datetime features",
            compatibility_score=0.90,
            why_these_columns=why_map,
        ))
    
    # FEATURE SELECTION - suggest if many features
    if len(column_insights) > 10:
        why_map = {"all": "Dataset has many features, feature selection can improve model"}
        recommendations.append(StepRecommendation(
            step_type="feature_selection",
            step_name="Feature Selection",
            recommended_columns=numeric_cols[:5] if numeric_cols else categorical_cols[:5],
            reason="Remove low-variance or redundant features to reduce dimensionality",
            compatibility_score=0.70,
            why_these_columns=why_map,
        ))
    
    return recommendations


def get_suggested_pipeline(recommendations: List[StepRecommendation]) -> List[str]:
    """Get suggested order of steps based on best practices"""
    # Typical order: encoding -> scaling -> feature_creation -> binning -> feature_selection
    step_order = {
        "encoding": 1,
        "scaling": 2,
        "feature_creation": 3,
        "binning": 4,
        "feature_selection": 5,
    }
    
    available_steps = [r.step_type for r in recommendations]
    sorted_steps = sorted(available_steps, key=lambda x: step_order.get(x, 99))
    return sorted_steps


def get_data_quality_notes(column_insights: List[ColumnInsight]) -> List[str]:
    """Generate data quality observations"""
    notes = []
    
    # Check for missing values
    high_missing = [c.name for c in column_insights if c.missing_percentage > 30]
    if high_missing:
        notes.append(f"⚠️ High missing values (>30%): {', '.join(high_missing)}")
    
    # Check for columns with single value
    single_value = [c.name for c in column_insights if c.cardinality == 1]
    if single_value:
        notes.append(f"⚠️ Constant columns (no variance): {', '.join(single_value)}")
    
    # Check for ID columns (very high cardinality, likely unique per row)
    total_rows = None
    id_cols = []
    for c in column_insights:
        if c.is_categorical and c.cardinality > 1000:
            # Likely an ID column
            id_cols.append(f"{c.name} ({c.cardinality} unique)")
    if id_cols:
        notes.append(f"🆔 ID/High-ID columns found - consider DROPPING these (not ML features): {', '.join(id_cols)}")
    
    # Check for high cardinality categorical
    high_cardinality = [
        f"{c.name} ({c.cardinality} unique)" for c in column_insights 
        if c.is_categorical and 50 < c.cardinality <= 1000
    ]
    if high_cardinality:
        notes.append(f"⚠️ High cardinality categorical (use LABEL encoding, not one-hot): {', '.join(high_cardinality)}")
    
    # Check for skewed data
    skewed = [
        c.name for c in column_insights
        if c.is_numeric and c.mean_value and c.std_value 
        and (abs(c.mean_value - c.min_value) > 3 * c.std_value or 
             abs(c.max_value - c.mean_value) > 3 * c.std_value)
    ]
    if skewed:
        notes.append(f"📊 Skewed numeric features (consider scaling/transformation): {', '.join(skewed)}")
    
    # Positive notes
    if not notes:
        notes.append("✅ Dataset looks good! No major data quality issues detected.")
    
    return notes


def analyze_dataset(df: pd.DataFrame, filename: str) -> DatasetAnalysis:
    """Analyze entire dataset and provide recommendations"""
    
    # Analyze each column
    column_insights = [analyze_column(df, col) for col in df.columns]
    
    # Get step recommendations
    step_recommendations = get_step_recommendations(column_insights)
    
    # Get suggested pipeline
    suggested_pipeline = get_suggested_pipeline(step_recommendations)
    
    # Get data quality notes
    data_quality_notes = get_data_quality_notes(column_insights)
    
    return DatasetAnalysis(
        filename=filename,
        total_rows=len(df),
        total_columns=len(df.columns),
        column_insights=column_insights,
        step_recommendations=step_recommendations,
        suggested_pipeline=suggested_pipeline,
        data_quality_notes=data_quality_notes,
    )
