from typing import Dict, List, Optional, TypedDict, Literal, Union, Any

# Scaling types
ScalingMethod = Literal["standard", "minmax", "robust", "log"]

# Encoding types
EncodingMethod = Literal["one_hot", "label", "target"]

# Binning types
BinningMethod = Literal["equal_width", "quantile"]

# Feature creation types
FeatureCreationMethod = Literal["polynomial", "datetime_decomposition", "aggregations"]

# Feature selection types
FeatureSelectionMethod = Literal["correlation_filter", "variance_threshold", "pca"]

# Backend types
BackendType = Literal["pandas", "pyspark"]

class ScalingConfig(TypedDict, total=False):
    method: ScalingMethod
    columns: List[str]

class EncodingConfig(TypedDict, total=False):
    method: EncodingMethod
    columns: List[str]
    target_column: Optional[str]  # For target encoding

class BinningConfig(TypedDict, total=False):
    method: BinningMethod
    columns: List[str]
    n_bins: int

class PolynomialConfig(TypedDict, total=False):
    degree: int
    columns: List[str]
    include_bias: bool

class DatetimeDecompositionConfig(TypedDict, total=False):
    columns: List[str]
    components: List[str]  # ['year', 'month', 'day', 'hour', 'minute', 'second', 'dayofweek', 'dayofyear']

class AggregationConfig(TypedDict, total=False):
    group_by: List[str]
    aggregations: Dict[str, List[str]]  # {column: [aggregation_functions]}

class FeatureCreationConfig(TypedDict, total=False):
    method: FeatureCreationMethod
    polynomial: Optional[PolynomialConfig]
    datetime_decomposition: Optional[DatetimeDecompositionConfig]
    aggregations: Optional[AggregationConfig]

class CorrelationFilterConfig(TypedDict, total=False):
    threshold: float
    columns: List[str]

class VarianceThresholdConfig(TypedDict, total=False):
    threshold: float
    columns: List[str]

class PCAConfig(TypedDict, total=False):
    n_components: Union[int, float, str]  # int, float (0-1), or 'mle'
    columns: List[str]

class FeatureSelectionConfig(TypedDict, total=False):
    method: FeatureSelectionMethod
    correlation_filter: Optional[CorrelationFilterConfig]
    variance_threshold: Optional[VarianceThresholdConfig]
    pca: Optional[PCAConfig]

class FeatureEngineeringStep(TypedDict, total=False):
    step_id: str
    operation: Literal["scaling", "encoding", "binning", "feature_creation", "feature_selection"]
    config: Union[ScalingConfig, EncodingConfig, BinningConfig, FeatureCreationConfig, FeatureSelectionConfig]

class FeatureEngineeringPayload(TypedDict, total=False):
    dataset_id: Optional[str]
    backend: BackendType
    steps: List[FeatureEngineeringStep]

class FeatureEngineeringResult(TypedDict, total=False):
    original_preview: List[Dict]
    preview: List[Dict]
    full_data: Optional[List[Dict]]
    feature_info: Dict[str, Any]
    step_results: List[Dict[str, Any]]
    engineered_filename: Optional[str]
    temp_engineered_path: Optional[str]
