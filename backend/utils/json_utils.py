import math
from datetime import date, datetime, time
from decimal import Decimal

import numpy as np
import pandas as pd

def _to_json_safe(value):
    if value is None:
        return None
    # pandas NA
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    # pandas / numpy containers
    if isinstance(value, pd.Series):
        return [_to_json_safe(v) for v in value.tolist()]
    if isinstance(value, np.ndarray):
        return [_to_json_safe(v) for v in value.tolist()]

    # numpy scalars
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, Decimal):
        return float(value)
    # python floats
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return value
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if hasattr(pd, "Timestamp") and isinstance(value, pd.Timestamp):
        return value.isoformat()
    # containers
    if isinstance(value, dict):
        return {k: _to_json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_json_safe(v) for v in value]
    return value
