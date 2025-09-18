from fastapi import APIRouter
from typing import Dict, Any, List
import io
import pandas as pd
import numpy as np

from backend.config import minio_client, MINIO_BUCKET
from backend.models.pydantic_models import (
    AutoMLRecommendRequest,
    AutoMLRecommendResponse,
    ModelRecommendation,
)

router = APIRouter(prefix="/api/auto-ml", tags=["Auto ML"])


def _read_engineered_sample(filename: str, max_rows: int = 20000) -> pd.DataFrame:
    # Engineered files are stored in the dedicated 'feature-engineered' bucket
    # Try engineered folder in main bucket first, then fallback to dedicated bucket if used.
    possible_paths = [filename.split('/')[-1]]
    # Try reading from main bucket first; rely on object's bucket info if prefixed with bucket
    last_err = None
    for object_name in possible_paths:
        try:
            response = minio_client.get_object("feature-engineered", object_name)
            data = io.BytesIO(response.read())
            data.seek(0)
        except Exception as e:
            last_err = e
            continue
        # Parse by extension
        if object_name.endswith(".parquet"):
            df = pd.read_parquet(data, engine="pyarrow")
        elif object_name.endswith(".csv"):
            df = pd.read_csv(data)
        elif object_name.endswith(".xlsx"):
            df = pd.read_excel(data)
        elif object_name.endswith(".json"):
            df = pd.read_json(data)
        else:
            df = pd.read_parquet(data, engine="pyarrow")
        if len(df) > max_rows:
            df = df.sample(n=max_rows, random_state=42)
        return df
    raise RuntimeError(f"Failed to read engineered file: {filename} ({last_err})")


def _list_engineered_files() -> List[str]:
    files: List[str] = []
    # List from a dedicated feature-engineered bucket
    try:
        if minio_client.bucket_exists("feature-engineered"):
            objects = minio_client.list_objects("feature-engineered", recursive=True)
            for obj in objects:
                if getattr(obj, "is_dir", False):
                    continue
                files.append(obj.object_name)
    except Exception:
        pass
    # De-duplicate
    return sorted(list(dict.fromkeys(files)))


def _profile_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    n_rows = int(len(df))
    n_cols = int(len(df.columns))
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = [c for c in df.columns if c not in num_cols]
    missing_ratio = float(df.isna().mean().mean()) if n_rows > 0 else 0.0
    high_cardinality = [c for c in cat_cols if df[c].nunique(dropna=True) > min(100, max(10, n_rows // 100))]
    skewed_numeric = [c for c in num_cols if abs(df[c].dropna().skew()) > 1]
    profile = {
        "n_rows": n_rows,
        "n_cols": n_cols,
        "n_numeric": int(len(num_cols)),
        "n_categorical": int(len(cat_cols)),
        "missing_ratio": missing_ratio,
        "high_cardinality_categorical": high_cardinality[:10],
        "skewed_numeric": skewed_numeric[:10],
    }
    return profile


def _rank_models(task: str, profile: Dict[str, Any], preference: str | None) -> List[ModelRecommendation]:
    n_rows = profile.get("n_rows", 0)
    many_cats = len(profile.get("high_cardinality_categorical", [])) > 0
    mostly_numeric = profile.get("n_numeric", 0) >= profile.get("n_cols", 0) * 0.6

    def rec(model_family: str, library: str, rationale: str, when: str, needs: List[str], caveats: List[str], time: str) -> ModelRecommendation:
        return ModelRecommendation(
            model_family=model_family,
            library=library,
            rationale_simple=rationale,
            when_to_use=when,
            needs_preprocessing=needs,
            caveats=caveats,
            est_training_time=time,
        )

    recs: List[ModelRecommendation] = []

    if task == "classification":
        if many_cats:
            recs.append(rec(
                "CatBoostClassifier", "catboost",
                "Great when you have many text/category columns. It understands categories without heavy encoding.",
                "Tabular data with many categorical features or mixed types.",
                ["Basic imputation for missing values"],
                ["May be slower on very large datasets", "Requires CatBoost library"],
                "medium" if n_rows < 500000 else "high",
            ))
        recs.append(rec(
            "LightGBMClassifier", "lightgbm",
            "Strong accuracy on tabular data and usually fast. Works well with many features.",
            "General classification on numeric or one-hot encoded data.",
            ["Impute missing values", "Encode categories (one-hot or target) if not using CatBoost"],
            ["Can overfit; use early stopping"],
            "low" if n_rows < 200000 else "medium",
        ))
        recs.append(rec(
            "RandomForestClassifier", "scikit-learn",
            "Solid, beginner-friendly baseline. Often good out-of-the-box with little tuning.",
            "Mixed-type tabular data, small to medium size.",
            ["Impute missing values", "Encode categories (one-hot)"],
            ["Slower on high feature counts", "Less accurate than boosting on complex problems"],
            "medium",
        ))
        recs.append(rec(
            "LogisticRegression", "scikit-learn",
            "Very fast and easy to understand. Good starting point if signal is mostly linear.",
            "Large datasets or when interpretability matters.",
            ["Scale numeric features", "One-hot encode categories"],
            ["May underfit on complex patterns"],
            "low",
        ))
    elif task == "regression":
        recs.append(rec(
            "LightGBMRegressor", "lightgbm",
            "Usually top performer on tabular regression. Handles non-linear patterns well.",
            "General tabular regression with numeric/mixed features.",
            ["Impute missing values", "Encode categories if present"],
            ["Tune learning rate and leaves for best results"],
            "low" if n_rows < 200000 else "medium",
        ))
        recs.append(rec(
            "RandomForestRegressor", "scikit-learn",
            "Robust and simple to use. Resistant to outliers and works with default settings.",
            "Small to medium datasets, non-linear relationships.",
            ["Impute missing values", "Encode categories if present"],
            ["Can be slow with many trees", "Less accurate than boosting in some cases"],
            "medium",
        ))
        if mostly_numeric:
            recs.append(rec(
                "ElasticNet", "scikit-learn",
                "Fast and interpretable linear model that balances L1/L2 regularization.",
                "When relationships are close to linear or you want feature weights.",
                ["Scale numeric features"],
                ["Underfits non-linear data"],
                "low",
            ))
        else:
            recs.append(rec(
                "GradientBoostingRegressor", "scikit-learn",
                "Good accuracy without extra libraries; handles moderate complexity.",
                "Mixed data with moderate size.",
                ["Impute missing values", "Encode categories"],
                ["Slower than LightGBM on big data"],
                "medium",
            ))
    elif task == "clustering":
        recs.append(rec(
            "KMeans", "scikit-learn",
            "Very fast and widely used. Good when clusters are roughly round and well separated.",
            "Numeric features with moderate dimensions.",
            ["Scale features"],
            ["Struggles with non-spherical clusters or varying densities"],
            "low",
        ))
        recs.append(rec(
            "GaussianMixture", "scikit-learn",
            "Gives soft cluster memberships and can model different cluster shapes.",
            "When clusters overlap or have different shapes.",
            ["Scale features"],
            ["Sensitive to initialization"],
            "medium",
        ))
        recs.append(rec(
            "DBSCAN", "scikit-learn",
            "Finds clusters of any shape and can mark noise points automatically.",
            "Data with irregular shapes or noise; you don’t know number of clusters.",
            ["Scale features", "Tune eps/min_samples"],
            ["Less scalable to very large datasets"],
            "medium" if n_rows < 200000 else "high",
        ))
    elif task == "time_series":
        recs.append(rec(
            "Prophet", "prophet",
            "Beginner-friendly for seasonal data. Handles trend and holidays easily.",
            "Univariate time series with clear seasonality.",
            ["Ensure a proper datetime column and frequency"],
            ["Extra dependency; better for daily/weekly data"],
            "medium",
        ))
        recs.append(rec(
            "SARIMAX", "statsmodels",
            "Classical model that works well for stable, seasonal series.",
            "Univariate time series with stationarity after differencing.",
            ["Check stationarity", "Seasonal params selection"],
            ["Parameter tuning can be tricky"],
            "medium",
        ))
        recs.append(rec(
            "LightGBM (lags)", "lightgbm",
            "Tree model on lagged features captures complex patterns and interactions.",
            "When you can engineer lag/rolling features and want strong accuracy.",
            ["Create lag/rolling features", "Impute missing timestamps"],
            ["Needs careful feature engineering"],
            "medium",
        ))

    # Simple preference reordering
    if preference == "speed":
        recs.sort(key=lambda r: {"low": 0, "medium": 1, "high": 2}[r.est_training_time])
    elif preference == "interpretability":
        order = {"LogisticRegression": -1, "ElasticNet": -1}
        recs.sort(key=lambda r: order.get(r.model_family, 0), reverse=True)

    # Deduplicate by model_family and keep top 3
    seen = set()
    unique: List[ModelRecommendation] = []
    for r in recs:
        if r.model_family not in seen:
            unique.append(r)
            seen.add(r.model_family)
        if len(unique) == 3:
            break
    return unique


@router.post("/recommend", response_model=AutoMLRecommendResponse)
def recommend_models(request: AutoMLRecommendRequest) -> AutoMLRecommendResponse:
    df = _read_engineered_sample(request.filename)
    profile = _profile_dataframe(df)
    recs = _rank_models(request.task, profile, request.preference)
    return AutoMLRecommendResponse(
        task=request.task,
        filename=request.filename,
        dataset_profile=profile,
        recommendations=recs,
    )


@router.get("/files/engineered", response_model=List[str])
def list_engineered_files_route() -> List[str]:
    return _list_engineered_files()


