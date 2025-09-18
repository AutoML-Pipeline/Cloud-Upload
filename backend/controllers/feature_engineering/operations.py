import pandas as pd
import numpy as np
from sklearn.preprocessing import (
    StandardScaler,
    MinMaxScaler,
    RobustScaler,
    OneHotEncoder,
    LabelEncoder,
    QuantileTransformer,
    PolynomialFeatures,
)
from sklearn.feature_selection import VarianceThreshold
from sklearn.decomposition import PCA
from typing import Dict, Any, List, Tuple, Optional


def apply_scaling(df: pd.DataFrame, columns: List[str], method: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    metadata: Dict[str, Any] = {"operation": "Scaling", "method": method, "columns": columns}
    if not columns:
        return df, metadata

    df_copy = df.copy()
    
    for col in columns:
        if col not in df_copy.columns:
            continue
            
        if df_copy[col].dtype in [np.float64, np.int64, float, int]:
            if method == "standard":
                scaler = StandardScaler()
                df_copy[col] = scaler.fit_transform(df_copy[[col]])
                metadata.setdefault("details", {})[col] = "scaled (standard)"
            elif method == "minmax":
                scaler = MinMaxScaler()
                df_copy[col] = scaler.fit_transform(df_copy[[col]])
                metadata.setdefault("details", {})[col] = "scaled (minmax)"
            elif method == "robust":
                scaler = RobustScaler()
                df_copy[col] = scaler.fit_transform(df_copy[[col]])
                metadata.setdefault("details", {})[col] = "scaled (robust)"
            elif method == "log":
                df_copy[col] = np.log1p(np.clip(df_copy[col], a_min=0, a_max=None))
                metadata.setdefault("details", {})[col] = "log1p transformation applied"
            else:
                metadata.setdefault("details", {})[col] = f"skipped (unknown method: {method})"
        else:
            metadata.setdefault("details", {})[col] = "skipped (non-numeric)"

    return df_copy, metadata


def apply_encoding(df: pd.DataFrame, columns: List[str], method: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    metadata: Dict[str, Any] = {"operation": "Encoding", "method": method, "columns": columns}
    if not columns:
        return df, metadata

    df_copy = df.copy()
    
    for col in columns:
        if col not in df_copy.columns:
            continue
            
        if df_copy[col].dtype == "object" or str(df_copy[col].dtype).startswith("category"):
            if method == "one-hot":
                encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
                encoded = encoder.fit_transform(df_copy[[col]])
                encoded_df = pd.DataFrame(
                    encoded, columns=encoder.get_feature_names_out([col]), index=df_copy.index
                )
                df_copy = pd.concat([df_copy.drop(columns=[col]), encoded_df], axis=1)
                metadata.setdefault("details", {})[col] = "one-hot encoded"
            elif method == "label":
                encoder = LabelEncoder()
                df_copy[col] = encoder.fit_transform(df_copy[col].astype(str))
                metadata.setdefault("details", {})[col] = "label encoded"
            elif method == "target":
                target_col = "target"
                if target_col in df_copy.columns:
                    means = df_copy.groupby(col)[target_col].transform("mean")
                    df_copy[f"{col}_target_encoded"] = means
                    df_copy = df_copy.drop(columns=[col])
                    metadata.setdefault("details", {})[col] = "target encoded (simplified)"
                else:
                    metadata.setdefault("details", {})[col] = "target encoding skipped (no target column)"
            else:
                raise ValueError(f"Unknown encoding method: {method}")
        else:
            metadata.setdefault("details", {})[col] = "skipped (non-categorical)"


def apply_binning(df: pd.DataFrame, columns: List[str], method: str, bins: int) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    metadata: Dict[str, Any] = {"operation": "Binning", "method": method, "columns": columns, "bins": bins}
    if not columns:
        return df, metadata

    df_copy = df.copy()
    
    for col in columns:
        if col not in df_copy.columns:
            continue
            
        if df_copy[col].dtype in [np.float64, np.int64, float, int]:
            if method == "equal-width":
                df_copy[f"{col}_binned"] = pd.cut(df_copy[col], bins=bins, labels=False, include_lowest=True)
                metadata.setdefault("details", {})[col] = "equal-width binned"
            elif method == "quantile":
                qt = QuantileTransformer(n_quantiles=bins, output_distribution="uniform", random_state=42)
                quant = qt.fit_transform(df_copy[[col]])
                df_copy[f"{col}_binned"] = pd.cut(quant.flatten(), bins=bins, labels=False, include_lowest=True)
                metadata.setdefault("details", {})[col] = "quantile binned"
            else:
                raise ValueError(f"Unknown binning method: {method}")
        else:
            metadata.setdefault("details", {})[col] = "skipped (non-numeric)"

    return df_copy, metadata


def apply_feature_creation(
    df: pd.DataFrame,
    columns: List[str],
    method: str,
    degree: Optional[int] = None,
    date_part: Optional[str] = None,
    aggregation_type: Optional[str] = None,
    new_column_name: Optional[str] = None,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    metadata: Dict[str, Any] = {"operation": "Feature Creation", "method": method, "columns": columns}
    if not columns:
        return df, metadata

    df_copy = df.copy()
            
    for col in columns:
        if col not in df_copy.columns:
            continue

        if method == "polynomial":
            if degree is None:
                raise ValueError("Degree must be provided for polynomial features")
            poly = PolynomialFeatures(degree=degree, include_bias=False)
            series = df_copy[[col]].dropna()
            if series.empty:
                metadata.setdefault("details", {})[col] = "polynomial skipped (no data)"
                continue
            poly_features = poly.fit_transform(series)
            for i in range(1, degree + 1):
                name = f"{col}_poly_{i}"
                values = pd.Series(poly_features[:, i - 1], index=series.index)
                if name in df_copy.columns:
                    name = f"{name}_dup"
                df_copy[name] = values
            metadata.setdefault("details", {})[col] = f"polynomial features (degree {degree})"
        elif method == "datetime_decomposition":
            try:
                s = pd.to_datetime(df_copy[col], errors="coerce")
                df_copy[f"{col}_year"] = s.dt.year
                df_copy[f"{col}_month"] = s.dt.month
                df_copy[f"{col}_day"] = s.dt.day
                df_copy[f"{col}_hour"] = s.dt.hour
                df_copy[f"{col}_minute"] = s.dt.minute
                df_copy[f"{col}_second"] = s.dt.second
                metadata.setdefault("details", {})[col] = "datetime decomposed"
            except Exception as e:
                metadata.setdefault("details", {})[col] = f"datetime decomposition failed: {e}"
        elif method == "aggregations":
            # This branch expects the first column to be the group key and the rest as values
            if aggregation_type is None or new_column_name is None:
                raise ValueError("Aggregation type and new column name must be provided for aggregations")
            # columns list like [group_col, value_col]
            if len(columns) < 2:
                raise ValueError("At least two columns are required for aggregation feature creation")
            group_col = columns[0]
            value_cols = columns[1:]
            if group_col not in df_copy.columns:
                raise ValueError(f"Grouping column {group_col} not found")
            for v in value_cols:
                if v not in df_copy.columns:
                    raise ValueError(f"Aggregation column {v} not found")
            if aggregation_type == "sum":
                df_copy[new_column_name] = df_copy.groupby(group_col)[value_cols].transform("sum").sum(axis=1)
            elif aggregation_type == "mean":
                df_copy[new_column_name] = df_copy.groupby(group_col)[value_cols].transform("mean").mean(axis=1)
            elif aggregation_type == "min":
                df_copy[new_column_name] = df_copy.groupby(group_col)[value_cols].transform("min").min(axis=1)
            elif aggregation_type == "max":
                df_copy[new_column_name] = df_copy.groupby(group_col)[value_cols].transform("max").max(axis=1)
            elif aggregation_type == "count":
                df_copy[new_column_name] = df_copy.groupby(group_col)[value_cols].transform("count").sum(axis=1)
            else:
                raise ValueError(f"Unknown aggregation type: {aggregation_type}")
            metadata.setdefault("details", {})["aggregation"] = {
                "group": group_col,
                "values": value_cols,
                "type": aggregation_type,
                "new_col": new_column_name,
            }
        else:
            raise ValueError(f"Unknown feature creation method: {method}")

    return df_copy, metadata


def apply_feature_selection(
    df: pd.DataFrame,
    columns: List[str],
    method: str,
    threshold: Optional[float] = None,
    n_components: Optional[int] = None,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    metadata: Dict[str, Any] = {"operation": "Feature Selection", "method": method}
    df_copy = df.copy()
            
    if not columns:
        columns_to_process = df_copy.select_dtypes(include=np.number).columns.tolist()
    else:
        columns_to_process = [c for c in columns if c in df_copy.columns and pd.api.types.is_numeric_dtype(df_copy[c])]
        if not columns_to_process:
            metadata["details"] = {"info": "No applicable numeric columns found for selection."}
            return df_copy, metadata

    df_numeric = df_copy[columns_to_process]
    initial_columns = df_numeric.columns.tolist()

    if method == "correlation_filter":
        if threshold is None:
            raise ValueError("Threshold must be provided for correlation filter")
        if df_numeric.empty or len(df_numeric.columns) < 2:
            metadata["details"] = {"info": "Not enough numerical columns for correlation filter."}
            return df_copy, metadata
        corr = df_numeric.corr().abs()
        upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
        to_drop = [c for c in upper.columns if any(upper[c] > threshold)]
        df_copy = df_copy.drop(columns=to_drop)
        metadata["details"] = {"dropped_columns": to_drop, "threshold": threshold}
    elif method == "variance_threshold":
        if threshold is None:
            raise ValueError("Threshold must be provided for variance threshold")
        selector = VarianceThreshold(threshold=threshold)
        selector.fit(df_numeric)
        kept = df_numeric.columns[selector.get_support()].tolist()
        df_copy = pd.concat([df_copy.drop(columns=initial_columns), df_numeric[kept]], axis=1)
        metadata["details"] = {"selected_columns": kept, "threshold": threshold}
    elif method == "pca":
        if n_components is None:
            raise ValueError("n_components must be provided for PCA")
        if n_components > len(df_numeric.columns):
            raise ValueError("n_components cannot be greater than the number of columns")
        pca = PCA(n_components=n_components)
        pcs = pca.fit_transform(df_numeric)
        pc_cols = [f"pca_component_{i+1}" for i in range(n_components)]
        pc_df = pd.DataFrame(pcs, columns=pc_cols, index=df_copy.index)
        df_copy = pd.concat([df_copy.drop(columns=initial_columns), pc_df], axis=1)
        metadata["details"] = {"n_components": n_components, "explained_variance_ratio": pca.explained_variance_ratio_.tolist()}
    else:
        raise ValueError(f"Unknown feature selection method: {method}")

    return df_copy, metadata
