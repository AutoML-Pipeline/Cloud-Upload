# AI Coding Agent Instructions for Cloud-Upload

## Project Overview
Full-stack ML data pipeline with **FastAPI backend** + **React+Vite frontend**. Orchestrates data ingestion, preprocessing, and feature engineering. Data flows through MinIO object storage with job tracking for long-running async operations.

---

## Architecture & Data Flow

### Core Pipeline Stages
1. **Data Ingestion** → Upload from files, URLs, Google Drive, SQL databases → stored in MinIO `uploads` bucket
2. **Preprocessing** → Apply cleaning (remove duplicates, nulls, outliers) → stored in `cleaned-data` bucket
3. **Feature Engineering** → Binning, encoding, scaling, selection → stored in `feature-engineered` bucket
4. **Model Training** → Auto-detect problem type, train multiple models, compare performance → stored in `models` + `training-results` buckets
5. **Prediction** → Use trained models for inference on new data → returns predictions with confidence scores

### Service Architecture
- **Routes** (`backend/routes/*.py`): FastAPI endpoint definitions only—**must delegate to controllers**
  - `file_routes.py`: File uploads (local, URL, Google Drive, SQL)
  - `data_routes.py`: Preprocessing operations and job tracking
  - `feature_engineering_routes.py`: Feature engineering operations
  - `model_training_routes.py`: Model training, recommendations, predictions
  - `auth_routes.py`: Authentication (Google OAuth, register, login)
- **Controllers** (`backend/controllers/*.py`): Business logic, MinIO interactions, preprocessing pipeline
  - `data_controller.py`: Preprocessing orchestration
  - `feature_engineering/controller.py`: Feature engineering orchestration
  - `model_training/controller.py`: Training and prediction orchestration
  - `file_controller.py`: File upload handling
  - `auth_controller.py`: Authentication logic
- **Services** (`backend/services/`): Reusable utilities (MinIO uploads, SQL queries, progress tracking, Google Drive)
- **Models** (`backend/models/pydantic_models.py`): Request/response validation schemas (use `Literal` types for enums)

### Async Job Pattern
Long-running operations (preprocessing, feature engineering) use **background tasks** with job tracking:

```python
# routes/data_routes.py - Create job, queue background task
@router.post("/preprocess/{filename}")
async def data_preprocessing(filename: str, request: Request, background_tasks: BackgroundTasks):
    job_id = progress_tracker.create_job()
    background_tasks.add_task(data_controller.run_preprocessing_job, job_id, filename, steps, preprocessing)
    return {"job_id": job_id}

# controllers/data_controller.py - Update progress, complete/fail job
def run_preprocessing_job(job_id: str, filename: str, steps: Dict, preprocessing: Dict):
    progress_tracker.update_job(job_id, status="running", progress=0)
    # ... do work ...
    progress_tracker.complete_job(job_id, result={...})

# Frontend polls GET /*/status/{job_id} until status == "completed" or "failed"
```

**Job lifecycle**: `pending` → `running` → `completed`/`failed`. In-memory state in `progress_tracker` (no persistence).

---

## Critical Patterns

### MinIO Bucket Organization
- `uploads`: Raw ingested files (auto-convert to `.parquet` for binary efficiency)
- `cleaned-data`: Post-preprocessing artifacts
- `feature-engineered`: Post-feature-engineering outputs
- `models`: Trained ML model files (`.pkl` via joblib)
- `training-results`: Model training metadata (metrics, configuration, feature columns)
- **Bucket creation**: `ensure_minio_buckets_exist()` runs on `backend/config.py` import
- **File I/O**: Always use `minio_client.get_object()` / `put_object()`, never local filesystem for data

### Data Standardization
- **Missing values**: `standardize_missing_indicators()` maps NaN, None, "N/A", "null" → pandas NaN before processing
- **Parquet**: Use `sanitize_dataframe_for_parquet()` before `to_parquet()` to handle edge cases (nested objects, etc.)
- **Preview limits**: `MAX_PREVIEW_ROWS = None` (show full datasets), `DIFF_ROW_LIMIT = 10000` for diff visualization

### Frontend API Communication
- Base URL: `http://localhost:8000` (Vite proxy in `vite.config.js`: `/auth`, etc.)
- Auth: JWT tokens in localStorage (`auth_token`, `access_token`)
- Response format: `{"job_id": "...", "filename": "..."}` or `{"error": "message"}`
- **No query params for status**—use dedicated `/status/{job_id}` endpoint

### Frontend Styling Rules
- Tailwind CSS ONLY for new or updated UI. Do not use inline style props (no `style={{...}}`).
- Avoid CSS Modules for new work. Legacy CSS Modules can remain until migrated to Tailwind.
- Reuse design tokens from `src/styles/tokens.css` where applicable; prefer Tailwind utilities and variables over hardcoded values.
- Page layout containers: centered `max-w-*` with `mx-auto`.
- Sticky headers: prefer `position: sticky` patterns (see `DataTable.jsx`).

####  Styling Rules (summary)
- Use Tailwind utility classes for all styling; do not use inline style props.
- Prefer Tailwind theme tokens and config over hardcoded hex/rgb and magic numbers.
- Layout containers: centered with `mx-auto` and appropriate `max-w-*`.
- State/UI variations via conditional class names, not inline styles.
- Sticky table headers: `sticky top-0 z-*` with backdrop/gradient if needed; avoid JS scroll hacks.
- Responsive rules: use Tailwind breakpoints; avoid ad-hoc media queries.
- Motion: subtle Tailwind transition utilities; avoid layout-thrashing animations.
- Z-index: use a small, consistent scale (base < dropdown < modal < toast).

### Component Structure & File Organization
- Keep page shells thin: orchestrate state and composition only. Move logic into hooks (`hooks/`) and view pieces into components (`components/`).
- Do not put everything in one file—split UI, logic, and small utilities into separate modules.
- Reuse shared UI pieces (e.g., `ConfirmDialog`) rather than re-implementing.
- CSS belongs with components as CSS Modules. Do not place unrelated styles in page-level CSS.

---

## Performance Optimizations (Read These!)

### Encoding Performance (ENCODING_FIX.md)
**Problem**: Per-column loop caused O(n*m) concat operations, hanging on multiple columns.  
**Solution**: Batch all columns into single `pd.get_dummies()` call:

```python
# WRONG - per-column loop
for col in columns:
    encoded = pd.get_dummies(df[[col]])
    df = pd.concat([df.drop(columns=[col]), encoded], axis=1)  # SLOW!

# RIGHT - batch processing
cols_to_encode = [col for col in columns if is_categorical(col)]
encoded_df = pd.get_dummies(df[cols_to_encode], columns=cols_to_encode, dtype=np.uint8)
df = df.drop(columns=cols_to_encode)
df = pd.concat([df, encoded_df], axis=1)  # Only once!
```

**Speedup**: 100-700x faster (5-30s → 0.043s for 50k rows × 3 cols).

### High-Cardinality Detection (HIGH_CARDINALITY_FIX.md)
**Problem**: One-hot encoding high-cardinality columns (>100 unique values) creates thousands of columns, taking minutes.  
**Solution**: Auto-detect and convert to label encoding:

```python
if col_method == "one-hot":
    unique_count = df[col].nunique()
    if unique_count > 100:
        logging.warning(f"🚫 AUTO-CONVERTING '{col}' ({unique_count} uniques) to LABEL encoding")
        col_method = "label"  # Force label encoding
```

**Speedup**: 1200-1800x faster (2-3 min → <0.1s for 45k unique values).

### Per-Column Method Overrides (PER_COLUMN_METHODS.md)
Feature engineering supports per-column method selection:

```json
{
  "steps": [{
    "type": "encoding",
    "method": "one-hot",              // Default for all columns
    "columns": ["cat_A", "cat_B", "cat_C"],
    "column_methods": {               // Optional overrides
      "cat_A": "label",
      "cat_C": "label"
    }
  }]
}
```

Backend: `column_methods.get(col, default_method)` to pick method per column.

---

## API Endpoints Reference

### File Management (`/files` and `/`)
- `POST /files/upload`: Upload local files
- `POST /files/upload-url`: Upload from URL
- `POST /upload-from-google-drive`: Upload from Google Drive
- `POST /upload-from-sql`: Upload from SQL database
- `GET /files/list`: List uploaded files
- `GET /files/download/{filename}`: Download file
- `GET /gdrive/list-files`: List Google Drive files
- `GET /data/preview/{filename}`: Preview dataset

### Preprocessing (`/api/data`)
- `POST /preprocess/{filename}`: Start preprocessing job
- `GET /preprocess/status/{job_id}`: Poll job status
- `POST /save_cleaned_to_minio`: Save cleaned dataset
- `POST /download_cleaned_csv`: Download cleaned CSV
- `GET /download_cleaned_file/{filename}`: Download cleaned file
- `GET /preview/{filename}`: Preview data

### Feature Engineering (`/api/feature-engineering`)
- `GET /files/cleaned`: List cleaned files
- `GET /analyze/{filename}`: Get recommendations
- `GET /preview/{filename}`: Preview dataset
- `POST /apply-feature-engineering/{filename}`: Start FE job
- `GET /status/{job_id}`: Poll FE job status
- `POST /save-result`: Save FE results
- `GET /files/{filename}/data`: Get FE file data
- `GET /files`: List FE files
- `POST /download-csv`: Download FE CSV

### Model Training & Prediction (`/api/model-training`)
- `GET /training/files`: List feature-engineered files for training
- `GET /training/recommendations/{filename}`: Get auto recommendations
- `POST /training/train/{filename}`: Start training job
- `GET /training/status/{job_id}`: Poll training status
- `GET /training/models`: List all trained models
- `GET /training/models/{model_id}`: Get model details
- `POST /training/predict/{model_id}`: Make predictions with model
- `DELETE /training/models/{model_id}`: Delete model

### Authentication (`/auth`)
- `GET /auth/google/login`: Google OAuth login
- `GET /auth/google/callback`: Google OAuth callback
- `POST /auth/register`: Register user
- `POST /auth/login`: Login user
- `POST /auth/refresh`: Refresh token
- `GET /auth/me`: Get current user
- `POST /auth/logout`: Logout
- `DELETE /auth/account`: Delete account

---

## Developer Workflows

### Running the Stack
```powershell
# Backend (requires Python 3.9+, MinIO, optional MongoDB)
cd .\backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (Vite dev server)
cd .\frontend
npm run dev  # http://localhost:5173
```

### Testing
- `backend/test_performance.py`: Benchmarking
- `backend/test_encoding_fix.py`, `test_high_cardinality_fix.py`: Performance regression tests
- No pytest/unittest suite; manual testing via scripts or browser

### Environment Setup (`.env` in backend/)
```env
MINIO_ENDPOINT=localhost:9000
MINIO_BUCKET=uploads
CLEANED_BUCKET=cleaned-data
FEATURE_ENGINEERED_BUCKET=feature-engineered
MODELS_BUCKET=models
TRAINING_RESULTS_BUCKET=training-results
MONGO_URI=mongodb://localhost:27017
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## Integration Points & Key Dependencies

### External Services
- **MinIO** (S3-compatible): `backend/config.py` minio_client, ensure buckets exist on startup
- **MongoDB** (optional auth): `motor` async driver; `_MOTOR_AVAILABLE` flag handles missing gracefully
- **Google OAuth/Drive**: `google-api-python-client` + `google-auth-oauthlib` in `gdrive_service.py`
- **Hugging Face Hub**: Dataset downloads via `huggingface_hub` library

### ML Stack
- Data: `pandas==2.3.2`, `pyarrow==21.0.0`, `scikit-learn==1.7.2`
- ML Models: `xgboost==2.1.3`, `lightgbm==4.5.0`, `joblib==1.4.2`
- Training: Supports 5-7 models (Logistic/Linear Regression, Random Forest, SVM, KNN, XGBoost, LightGBM)
- Problem Detection: Auto-classifies as classification or regression based on target column analysis

### Frontend Stack
- Routing: `react-router-dom@7.5.1` (lazy-loaded pages in `App.jsx`)
- Pages Structure:
  - `/`: Landing page
  - `/login`, `/register`, `/manage-account`: Authentication
  - `/dashboard`: Main dashboard with pipeline overview
  - `/data-ingestion`: Data upload hub (file, URL, SQL, Google Drive, HuggingFace)
  - `/preprocessing`: Data cleaning wizard
  - `/feature-engineering`: Feature engineering wizard
  - `/model-training`: Model training wizard (4-step process)
  - `/models-list`: Trained models library
  - `/predict`: Prediction interface for trained models
  - `/files`: File manager for all buckets
- UI: `@shadcn/ui`, `@radix-ui/*`, `lucide-react` icons
- Styling: Tailwind CSS 4.1.4 (primary). Legacy CSS Modules may exist; prefer Tailwind for all new/updated UI and avoid inline styles.
- Tables: `react-virtualized` for large datasets (`DataTable.jsx`)
- Notifications: `react-hot-toast` (use `toast.error()`, `toast.success()`)
- Animations: `gsap` (page transitions), `keen-slider` (carousel in `DashboardCarousel.jsx`)

---

## Common Tasks

### Adding a Model Training Feature
1. Update model list in `backend/controllers/model_training/trainers.py` (`CLASSIFICATION_MODELS` or `REGRESSION_MODELS`)
2. Add model instantiation and hyperparameters to `train_single_model()` function
3. Update recommendations in `backend/controllers/model_training/problem_detector.py` if needed
4. Frontend will auto-detect new models from backend response

### Adding a Preprocessing Step
1. Create `backend/controllers/preprocessing/new_step.py` with `apply(df: pd.DataFrame, config: Dict) → pd.DataFrame`
2. Import in `backend/controllers/data_controller.py`
3. Add to step pipeline in `run_preprocessing_job()` switch/if-else
4. Update `backend/models/pydantic_models.py` if new config needed (use Pydantic `BaseModel` + `Literal` types)
5. Frontend: Add UI in `frontend/src/pages/preprocessing/Preprocessing.jsx`

### Adding a Feature Engineering Operation
1. Add function to `backend/controllers/feature_engineering/operations.py`
2. Update `controller.py` to call new operation in `apply_feature_engineering_steps()`
3. Add config model to `backend/controllers/feature_engineering/types.py`
4. Frontend: Update `FeatureEngineering.jsx` with new step UI

### Adding a Data Table View
```jsx
import DataTable from "components/DataTable.jsx";

<DataTable 
  data={tableData} 
  columns={["col1", "col2"]} 
  diffMarks={diffMarks}        // Optional: highlight changed cells
  saveTarget="engineered"       // "cleaned-data" or "feature-engineered"
  onSave={(filename) => ...}    // Optional custom save handler
/>
```

Component auto-handles CSV download, MinIO save, pagination, filtering, sorting.

### Making Predictions with Trained Models
1. Navigate to `/predict` or click "Make Predictions" from ModelTraining/ModelsList pages
2. Select a trained model (auto-populated from `training-results` bucket)
3. Upload CSV/Excel with same columns as training data
4. Backend validates columns, makes predictions with confidence scores
5. Download results as CSV with predictions column

---

## Troubleshooting

- **MinIO bucket not found**: `ensure_minio_buckets_exist()` in `backend/config.py` runs on import; check MinIO server running on port 9000
- **Job status 404**: Jobs are in-memory; if backend restarts, job IDs lost. Ensure polling within reasonable timeframe.
- **CORS errors**: Frontend origin must match `allow_origins` in `backend/main.py` (currently `http://localhost:5173`)
- **Encoding/feature engineering hangs**: Check for high-cardinality columns (see HIGH_CARDINALITY_FIX.md)
- **Motor import fails**: MongoDB optional; `_MOTOR_AVAILABLE` flag allows graceful degradation
- **Frontend build errors**: Ensure `npm install` completed; check `frontend/package.json` for correct React 19 + Vite 6 versions

---

## Important Notes

- **Route → Controller → Service**: Routes are **thin layers**—all business logic goes in controllers
- **Parquet-first**: Always convert to `.parquet` for MinIO storage (efficient binary format)
- **Job tracking**: In-memory only; not persisted to DB (trade-off for simplicity)
- **No inline styles**: Use Tailwind classes (no `style={{...}}`). Avoid CSS Modules for new work.
- **Data quality**: `analyze_data_quality()` in `data_controller.py` provides pre-processing health score
- **Frontend lazy loading**: All pages lazy-loaded in `App.jsx` with `React.lazy()` + Suspense
