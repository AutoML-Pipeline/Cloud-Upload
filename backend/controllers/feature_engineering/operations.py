import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any, Union
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, LabelEncoder, OneHotEncoder
from sklearn.feature_selection import VarianceThreshold, SelectKBest, f_classif
from sklearn.decomposition import PCA
from sklearn.preprocessing import KBinsDiscretizer
import warnings
warnings.filterwarnings('ignore')

from .types import (
    ScalingConfig, EncodingConfig, BinningConfig, FeatureCreationConfig,
    FeatureSelectionConfig, ScalingMethod, EncodingMethod, BinningMethod,
    FeatureCreationMethod, FeatureSelectionMethod
)

def apply_scaling(df: pd.DataFrame, config: ScalingConfig) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Apply scaling transformation to specified columns"""
    df_result = df.copy()
    method = config.get('method', 'standard')
    columns = config.get('columns', [])
    
    if not columns:
        # Auto-select numeric columns if none specified
        columns = df.select_dtypes(include=[np.number]).columns.tolist()
    
    metadata = {
        'operation': 'scaling',
        'method': method,
        'columns': columns,
        'summary': []
    }
    
    for col in columns:
        if col not in df.columns:
            continue
            
        if df[col].dtype not in [np.number]:
            continue
            
        try:
            if method == 'standard':
                scaler = StandardScaler()
            elif method == 'minmax':
                scaler = MinMaxScaler()
            elif method == 'robust':
                scaler = RobustScaler()
            elif method == 'log':
                # Log transformation (handle zeros and negatives)
                df_result[col] = np.log1p(np.abs(df[col])) * np.sign(df[col])
                metadata['summary'].append(f"Applied log transformation to {col}")
                continue
            else:
                continue
                
            # Fit and transform
            df_result[col] = scaler.fit_transform(df[[col]]).flatten()
            metadata['summary'].append(f"Applied {method} scaling to {col}")
            
        except Exception as e:
            metadata['summary'].append(f"Failed to scale {col}: {str(e)}")
    
    return df_result, metadata

def apply_encoding(df: pd.DataFrame, config: EncodingConfig) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Apply encoding transformation to specified columns"""
    df_result = df.copy()
    method = config.get('method', 'one_hot')
    columns = config.get('columns', [])
    target_column = config.get('target_column')
    
    if not columns:
        # Auto-select categorical columns if none specified
        columns = df.select_dtypes(include=['object', 'category']).columns.tolist()
    
    metadata = {
        'operation': 'encoding',
        'method': method,
        'columns': columns,
        'summary': []
    }
    
    for col in columns:
        if col not in df.columns:
            continue
            
        try:
            if method == 'one_hot':
                # One-hot encoding
                dummies = pd.get_dummies(df[col], prefix=col, dummy_na=True)
                df_result = pd.concat([df_result.drop(columns=[col]), dummies], axis=1)
                metadata['summary'].append(f"Applied one-hot encoding to {col} ({len(dummies.columns)} new columns)")
                
            elif method == 'label':
                # Label encoding
                le = LabelEncoder()
                df_result[col] = le.fit_transform(df[col].astype(str))
                metadata['summary'].append(f"Applied label encoding to {col}")
                
            elif method == 'target' and target_column and target_column in df.columns:
                # Target encoding (mean encoding)
                target_mean = df.groupby(col)[target_column].mean()
                df_result[col] = df[col].map(target_mean)
                metadata['summary'].append(f"Applied target encoding to {col} using {target_column}")
            else:
                metadata['summary'].append(f"Skipped {col}: target column not specified for target encoding")
                
        except Exception as e:
            metadata['summary'].append(f"Failed to encode {col}: {str(e)}")
    
    return df_result, metadata

def apply_binning(df: pd.DataFrame, config: BinningConfig) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Apply binning/discretization to specified columns"""
    df_result = df.copy()
    method = config.get('method', 'equal_width')
    columns = config.get('columns', [])
    n_bins = config.get('n_bins', 5)
    
    if not columns:
        # Auto-select numeric columns if none specified
        columns = df.select_dtypes(include=[np.number]).columns.tolist()
    
    metadata = {
        'operation': 'binning',
        'method': method,
        'columns': columns,
        'n_bins': n_bins,
        'summary': []
    }
    
    for col in columns:
        if col not in df.columns:
            continue
            
        if df[col].dtype not in [np.number]:
            continue
            
        try:
            if method == 'equal_width':
                # Equal width binning
                df_result[col] = pd.cut(df[col], bins=n_bins, labels=False, include_lowest=True)
            elif method == 'quantile':
                # Quantile binning
                df_result[col] = pd.qcut(df[col], q=n_bins, labels=False, duplicates='drop')
            
            metadata['summary'].append(f"Applied {method} binning to {col} ({n_bins} bins)")
            
        except Exception as e:
            metadata['summary'].append(f"Failed to bin {col}: {str(e)}")
    
    return df_result, metadata

def apply_feature_creation(df: pd.DataFrame, config: FeatureCreationConfig) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Apply feature creation transformations"""
    df_result = df.copy()
    method = config.get('method', 'polynomial')
    
    metadata = {
        'operation': 'feature_creation',
        'method': method,
        'summary': []
    }
    
    try:
        if method == 'polynomial' and 'polynomial' in config:
            poly_config = config['polynomial']
            degree = poly_config.get('degree', 2)
            columns = poly_config.get('columns', [])
            include_bias = poly_config.get('include_bias', False)
            
            if not columns:
                columns = df.select_dtypes(include=[np.number]).columns.tolist()
            
            # Create polynomial features
            for col in columns:
                if col in df.columns and df[col].dtype in [np.number]:
                    for d in range(2, degree + 1):
                        new_col = f"{col}_poly_{d}"
                        df_result[new_col] = df[col] ** d
                        metadata['summary'].append(f"Created polynomial feature {new_col}")
            
            if include_bias:
                df_result['bias'] = 1
                metadata['summary'].append("Added bias term")
        
        elif method == 'datetime_decomposition' and 'datetime_decomposition' in config:
            dt_config = config['datetime_decomposition']
            columns = dt_config.get('columns', [])
            components = dt_config.get('components', ['year', 'month', 'day'])
            
            for col in columns:
                if col in df.columns:
                    try:
                        # Convert to datetime if not already
                        dt_series = pd.to_datetime(df[col], errors='coerce')
                        
                        for component in components:
                            if component == 'year':
                                df_result[f"{col}_year"] = dt_series.dt.year
                            elif component == 'month':
                                df_result[f"{col}_month"] = dt_series.dt.month
                            elif component == 'day':
                                df_result[f"{col}_day"] = dt_series.dt.day
                            elif component == 'hour':
                                df_result[f"{col}_hour"] = dt_series.dt.hour
                            elif component == 'minute':
                                df_result[f"{col}_minute"] = dt_series.dt.minute
                            elif component == 'second':
                                df_result[f"{col}_second"] = dt_series.dt.second
                            elif component == 'dayofweek':
                                df_result[f"{col}_dayofweek"] = dt_series.dt.dayofweek
                            elif component == 'dayofyear':
                                df_result[f"{col}_dayofyear"] = dt_series.dt.dayofyear
                        
                        metadata['summary'].append(f"Decomposed datetime {col} into {len(components)} components")
                        
                    except Exception as e:
                        metadata['summary'].append(f"Failed to decompose datetime {col}: {str(e)}")
        
        elif method == 'aggregations' and 'aggregations' in config:
            agg_config = config['aggregations']
            group_by = agg_config.get('group_by', [])
            aggregations = agg_config.get('aggregations', {})
            
            if group_by and aggregations:
                # Group by specified columns and apply aggregations
                grouped = df.groupby(group_by)
                
                for col, agg_funcs in aggregations.items():
                    if col in df.columns:
                        for func in agg_funcs:
                            if func in ['mean', 'sum', 'count', 'min', 'max', 'std', 'var']:
                                new_col = f"{col}_{func}_by_{'_'.join(group_by)}"
                                df_result[new_col] = grouped[col].transform(func)
                                metadata['summary'].append(f"Created aggregation {new_col}")
    
    except Exception as e:
        metadata['summary'].append(f"Feature creation failed: {str(e)}")
    
    return df_result, metadata

def apply_feature_selection(df: pd.DataFrame, config: FeatureSelectionConfig) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Apply feature selection transformations"""
    df_result = df.copy()
    method = config.get('method', 'variance_threshold')
    
    metadata = {
        'operation': 'feature_selection',
        'method': method,
        'summary': []
    }
    
    try:
        if method == 'correlation_filter' and 'correlation_filter' in config:
            corr_config = config['correlation_filter']
            threshold = corr_config.get('threshold', 0.95)
            columns = corr_config.get('columns', [])
            
            if not columns:
                columns = df.select_dtypes(include=[np.number]).columns.tolist()
            
            # Calculate correlation matrix
            corr_matrix = df[columns].corr().abs()
            
            # Find highly correlated pairs
            upper_tri = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
            to_drop = [column for column in upper_tri.columns if any(upper_tri[column] > threshold)]
            
            df_result = df_result.drop(columns=to_drop)
            metadata['summary'].append(f"Removed {len(to_drop)} highly correlated features (threshold: {threshold})")
        
        elif method == 'variance_threshold' and 'variance_threshold' in config:
            var_config = config['variance_threshold']
            threshold = var_config.get('threshold', 0.01)
            columns = var_config.get('columns', [])
            
            if not columns:
                columns = df.select_dtypes(include=[np.number]).columns.tolist()
            
            # Apply variance threshold
            selector = VarianceThreshold(threshold=threshold)
            selected_features = selector.fit_transform(df[columns])
            selected_columns = [col for i, col in enumerate(columns) if selector.get_support()[i]]
            
            # Keep only selected features
            df_result = df_result.drop(columns=[col for col in columns if col not in selected_columns])
            metadata['summary'].append(f"Removed {len(columns) - len(selected_columns)} low-variance features (threshold: {threshold})")
        
        elif method == 'pca' and 'pca' in config:
            pca_config = config['pca']
            n_components = pca_config.get('n_components', 0.95)
            columns = pca_config.get('columns', [])
            
            if not columns:
                columns = df.select_dtypes(include=[np.number]).columns.tolist()
            
            # Apply PCA
            pca = PCA(n_components=n_components)
            pca_features = pca.fit_transform(df[columns])
            
            # Create new PCA columns
            pca_columns = [f"pca_{i+1}" for i in range(pca_features.shape[1])]
            pca_df = pd.DataFrame(pca_features, columns=pca_columns, index=df.index)
            
            # Replace original columns with PCA features
            df_result = df_result.drop(columns=columns)
            df_result = pd.concat([df_result, pca_df], axis=1)
            
            metadata['summary'].append(f"Applied PCA: {len(columns)} features → {len(pca_columns)} components (explained variance: {pca.explained_variance_ratio_.sum():.3f})")
    
    except Exception as e:
        metadata['summary'].append(f"Feature selection failed: {str(e)}")
    
    return df_result, metadata

def get_feature_info(df: pd.DataFrame) -> Dict[str, Any]:
    """Get comprehensive feature information"""
    info = {
        'total_features': len(df.columns),
        'feature_types': {},
        'missing_values': {},
        'unique_values': {},
        'statistics': {}
    }
    
    for col in df.columns:
        info['feature_types'][col] = str(df[col].dtype)
        info['missing_values'][col] = int(df[col].isnull().sum())
        info['unique_values'][col] = int(df[col].nunique())
        
        if df[col].dtype in [np.number]:
            info['statistics'][col] = {
                'mean': float(df[col].mean()) if not df[col].isnull().all() else None,
                'std': float(df[col].std()) if not df[col].isnull().all() else None,
                'min': float(df[col].min()) if not df[col].isnull().all() else None,
                'max': float(df[col].max()) if not df[col].isnull().all() else None,
                'skewness': float(df[col].skew()) if not df[col].isnull().all() else None
            }
    
    return info
