# Pydantic request/response models for API endpoints
from typing import Optional, List, Dict, Any, Union, Literal
from pydantic import BaseModel

class UploadFromURLRequest(BaseModel):
    url: str
    filename: Optional[str] = None

class UploadFromGoogleDriveRequest(BaseModel):
    file_id: str
    access_token: str
    filename: Optional[str] = None

class SQLWorkbenchRequest(BaseModel):
    host: str
    port: int
    user: str
    password: str
    database: str
    query: str
    filename: Optional[str] = None

class SQLConnectRequest(BaseModel):
    host: str
    port: int
    user: str
    password: str

# Feature Engineering Models
class ScalingConfig(BaseModel):
    method: Literal["standard", "minmax", "robust", "log"] = "standard"
    columns: List[str] = []

class EncodingConfig(BaseModel):
    method: Literal["one_hot", "label", "target"] = "one_hot"
    columns: List[str] = []
    target_column: Optional[str] = None

class BinningConfig(BaseModel):
    method: Literal["equal_width", "quantile"] = "equal_width"
    columns: List[str] = []
    n_bins: int = 5

class PolynomialConfig(BaseModel):
    degree: int = 2
    columns: List[str] = []
    include_bias: bool = False

class DatetimeDecompositionConfig(BaseModel):
    columns: List[str] = []
    components: List[str] = ["year", "month", "day"]

class AggregationConfig(BaseModel):
    group_by: List[str] = []
    aggregations: Dict[str, List[str]] = {}

class FeatureCreationConfig(BaseModel):
    method: Literal["polynomial", "datetime_decomposition", "aggregations"] = "polynomial"
    polynomial: Optional[PolynomialConfig] = None
    datetime_decomposition: Optional[DatetimeDecompositionConfig] = None
    aggregations: Optional[AggregationConfig] = None

class CorrelationFilterConfig(BaseModel):
    threshold: float = 0.95
    columns: List[str] = []

class VarianceThresholdConfig(BaseModel):
    threshold: float = 0.01
    columns: List[str] = []

class PCAConfig(BaseModel):
    n_components: Union[int, float, str] = 0.95
    columns: List[str] = []

class FeatureSelectionConfig(BaseModel):
    method: Literal["correlation_filter", "variance_threshold", "pca"] = "variance_threshold"
    correlation_filter: Optional[CorrelationFilterConfig] = None
    variance_threshold: Optional[VarianceThresholdConfig] = None
    pca: Optional[PCAConfig] = None

class FeatureEngineeringStep(BaseModel):
    step_id: str
    operation: Literal["scaling", "encoding", "binning", "feature_creation", "feature_selection"]
    config: Union[ScalingConfig, EncodingConfig, BinningConfig, FeatureCreationConfig, FeatureSelectionConfig]

class FeatureEngineeringRequest(BaseModel):
    dataset_id: Optional[str] = None
    backend: Literal["pandas", "pyspark"] = "pandas"
    steps: List[FeatureEngineeringStep] = []
