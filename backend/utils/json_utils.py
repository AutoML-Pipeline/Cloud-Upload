import pandas as pd
import numpy as np
import math

def _to_json_safe(value):
    if value is None:
        return None
    # pandas NA
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
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
    # python floats
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return value
    # containers
    if isinstance(value, dict):
        return {k: _to_json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_json_safe(v) for v in value]
    return value
