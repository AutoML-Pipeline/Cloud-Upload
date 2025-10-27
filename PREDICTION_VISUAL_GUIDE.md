# 🔮 Prediction Feature - Visual Guide

## Complete ML Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    📊 DATA INGESTION                            │
│  Upload: Files, URLs, Google Drive, SQL, Hugging Face          │
│  ↓ Stored in MinIO `uploads` bucket                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    🧹 PREPROCESSING                             │
│  Clean: Remove duplicates, nulls, outliers                     │
│  ↓ Stored in MinIO `cleaned-data` bucket                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                 ⚙️ FEATURE ENGINEERING                          │
│  Transform: Binning, encoding, scaling, selection              │
│  ↓ Stored in MinIO `feature-engineered` bucket                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    🤖 MODEL TRAINING                            │
│  Train: Multiple models, auto-select best                      │
│  ↓ Model saved to MinIO `models` bucket                        │
│  ↓ Results saved to `training-results` bucket                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              🔮 PREDICTIONS (NEW!)                              │
│  Deploy: Upload new data → Get predictions                     │
│  ↓ Download results as CSV                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prediction Page UI Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ 🔮 Make Predictions                                   [← Dashboard]│
│ Use a trained model to predict outcomes on new data               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ 1️⃣ SELECT MODEL                                                   │
│ Choose a trained model to use for predictions                     │
│                                                                    │
│ ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│ │ Random Forest  │  │ XGBoost     ✓  │  │ Logistic Reg   │       │
│ │ 🎯 Classification│  │ 🎯 Classification│  │ 🎯 Classification│       │
│ │ Accuracy: 94.5%│  │ Accuracy: 93.2%│  │ Accuracy: 89.1%│       │
│ │ Jan 20, 2025   │  │ Jan 20, 2025   │  │ Jan 19, 2025   │       │
│ └────────────────┘  └────────────────┘  └────────────────┘       │
│                     (Purple highlight = Selected)                 │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ 2️⃣ UPLOAD DATA                                                    │
│ Upload a CSV or Excel file with the same features                 │
│                                                                    │
│ ┌──────────────────────────────────────────────────────────┐     │
│ │                         📁                               │     │
│ │                                                          │     │
│ │         dataset_for_prediction.csv                       │     │
│ │         150 rows loaded • Click to change                │     │
│ │                                                          │     │
│ └──────────────────────────────────────────────────────────┘     │
│                                                                    │
│ ✓ Data loaded: 150 rows with 12 columns                          │
│                                                                    │
│                   [Generate Predictions 🚀]                        │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ✅ PREDICTION RESULTS                                             │
│ 150 predictions generated using XGBoost                           │
│                                                                    │
│ ┌──────────┐  ┌──────────────┐  ┌──────────────┐                │
│ │ 🎯 Model │  │ 📊 Problem   │  │ 🔢 Predictions│                │
│ │ XGBoost  │  │ Classification│  │     150      │                │
│ └──────────┘  └──────────────┘  └──────────────┘                │
│                                                                    │
│ ┌──────────────────────────────────────────────────────────┐     │
│ │  #  │ Prediction │ Confidence │ Class Probabilities      │     │
│ ├─────┼────────────┼────────────┼──────────────────────────┤     │
│ │  1  │ High       │   92.3%    │ Low:2%, Mid:5%, High:92% │     │
│ │  2  │ Medium     │   85.7%    │ Low:8%, Mid:85%, High:7% │     │
│ │  3  │ High       │   96.1%    │ Low:1%, Mid:2%, High:96% │     │
│ │ ... │    ...     │    ...     │         ...              │     │
│ │ 100 │ Low        │   88.9%    │ Low:88%, Mid:10%, High:2%│     │
│ └──────────────────────────────────────────────────────────┘     │
│                                                                    │
│ Showing first 100 of 150 predictions                              │
│                                                                    │
│ [📥 Download All Predictions (CSV)]  [Make Another Prediction]    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Navigation Flow

### From Model Training Results:

```
┌─────────────────────────────────────────────┐
│  ✅ Training Completed!                     │
│  Successfully trained 3 models              │
│                                             │
│  🏆 Best Model: Random Forest               │
│  Accuracy: 94.5%                            │
│                                             │
│  📊 Model Comparison Table                  │
│  [Table with all models...]                 │
│                                             │
│  [Train Another Model]                      │
│  [Make Predictions with Best Model 🔮] ←──┐ │
└─────────────────────────────────────────────┘│
                                               │
                    Clicks button              │
                          ↓                     │
┌─────────────────────────────────────────────┐│
│  🔮 Make Predictions                        ││
│  (XGBoost auto-selected)                    ││
│                                             ││
│  1️⃣ SELECT MODEL                            ││
│  ┌──────────────┐                           ││
│  │ XGBoost   ✓  │ ← Pre-selected            ││
│  └──────────────┘                           ││
│                                             ││
│  2️⃣ UPLOAD DATA                             ││
│  [Upload area...]                           ││
└─────────────────────────────────────────────┘┘
```

### From Models List Page:

```
┌─────────────────────────────────────────────┐
│  📚 Trained Models                          │
│                                             │
│  ┌───────────────┐    ┌──────────────────┐ │
│  │ Model List    │    │ Model Details    │ │
│  │               │    │                  │ │
│  │ • XGBoost  ←──┼────┤ Name: XGBoost    │ │
│  │ • Random F    │    │ Type: Classifier │ │
│  │ • Logistic    │    │ Accuracy: 93.2%  │ │
│  │               │    │                  │ │
│  │               │    │ [🔮 Make          │ │
│  │               │    │  Predictions]  ←─┼─┐
│  │               │    │ [🗑️ Delete]      │ ││
│  └───────────────┘    └──────────────────┘ ││
└─────────────────────────────────────────────┘│
                                               │
                    Clicks button              │
                          ↓                     │
┌─────────────────────────────────────────────┐│
│  🔮 Make Predictions                        ││
│  (XGBoost auto-selected)                    ││
└─────────────────────────────────────────────┘┘
```

---

## Data Flow Diagram

```
                    ┌─────────────────┐
                    │   USER UPLOADS  │
                    │   CSV/Excel     │
                    └────────┬────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │  FRONTEND       │
                    │  Parses File    │
                    │  (PapaParse/    │
                    │   xlsx)         │
                    └────────┬────────┘
                             │
                             │ JSON Array
                             ↓
┌──────────────────────────────────────────────────────┐
│ POST /api/model-training/training/predict/{model_id}│
│ Body: {"data": [{...}, {...}, ...]}                 │
└────────────────────────┬─────────────────────────────┘
                         │
                         ↓
              ┌──────────────────────┐
              │  BACKEND CONTROLLER  │
              │  make_predictions()  │
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         ↓               ↓               ↓
┌────────────┐  ┌────────────┐  ┌────────────┐
│ Load Model │  │ Load Model │  │ Validate   │
│ Metadata   │  │ (.joblib)  │  │ Columns    │
│ from MinIO │  │ from MinIO │  │            │
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘
      │               │               │
      └───────────────┴───────────────┘
                      │
                      ↓
           ┌──────────────────────┐
           │  Prepare DataFrame   │
           │  • Order columns     │
           │  • Encode categoricals│
           └──────────┬───────────┘
                      │
                      ↓
           ┌──────────────────────┐
           │  model.predict()     │
           │  model.predict_proba()│
           └──────────┬───────────┘
                      │
                      ↓
           ┌──────────────────────┐
           │  Build Response      │
           │  • Predictions       │
           │  • Confidence        │
           │  • Probabilities     │
           └──────────┬───────────┘
                      │
                      │ JSON Response
                      ↓
           ┌──────────────────────┐
           │  FRONTEND            │
           │  Display Results     │
           │  • Table             │
           │  • Download CSV      │
           └──────────────────────┘
```

---

## Example: Classification Prediction

### Input Data (CSV):
```csv
sepal_length,sepal_width,petal_length,petal_width
5.1,3.5,1.4,0.2
6.7,3.1,4.7,1.5
7.2,3.6,6.1,2.5
```

### Backend Processing:
```python
# 1. Load model trained on Iris dataset
model = load_model("iris_rf_model_id")

# 2. Validate columns
expected = ["sepal_length", "sepal_width", "petal_length", "petal_width"]
provided = df.columns.tolist()
# ✓ All columns present

# 3. Make predictions
predictions = model.predict(df)
probabilities = model.predict_proba(df)

# predictions = ["setosa", "versicolor", "virginica"]
# probabilities = [
#   [0.98, 0.01, 0.01],
#   [0.05, 0.92, 0.03],
#   [0.01, 0.04, 0.95]
# ]
```

### Output (Table):
```
┌───┬────────────┬────────────┬─────────────────────────────────┐
│ # │ Prediction │ Confidence │ Class Probabilities             │
├───┼────────────┼────────────┼─────────────────────────────────┤
│ 1 │ setosa     │   98.0%    │ setosa:98%, versicolor:1%, v... │
│ 2 │ versicolor │   92.0%    │ setosa:5%, versicolor:92%, v... │
│ 3 │ virginica  │   95.0%    │ setosa:1%, versicolor:4%, v...  │
└───┴────────────┴────────────┴─────────────────────────────────┘
```

### Downloaded CSV:
```csv
sepal_length,sepal_width,petal_length,petal_width,prediction,confidence
5.1,3.5,1.4,0.2,setosa,0.9800
6.7,3.1,4.7,1.5,versicolor,0.9200
7.2,3.6,6.1,2.5,virginica,0.9500
```

---

## Example: Regression Prediction

### Input Data (CSV):
```csv
sqft,bedrooms,bathrooms,location
1500,3,2,urban
2200,4,3,suburban
1800,3,2,urban
```

### Backend Processing:
```python
# 1. Load model trained on house prices
model = load_model("house_price_lr_model_id")

# 2. Encode categorical 'location'
# urban → 0, suburban → 1

# 3. Make predictions
predictions = model.predict(df)

# predictions = [325000, 475000, 365000]
```

### Output (Table):
```
┌───┬────────────┐
│ # │ Prediction │
├───┼────────────┤
│ 1 │  325000.00 │
│ 2 │  475000.00 │
│ 3 │  365000.00 │
└───┴────────────┘
```

### Downloaded CSV:
```csv
sqft,bedrooms,bathrooms,location,prediction
1500,3,2,urban,325000.00
2200,4,3,suburban,475000.00
1800,3,2,urban,365000.00
```

---

## Error Handling Examples

### Error 1: Missing Columns
```
❌ Missing required columns: age, income
   Model expects: age, income, education, location
```

### Error 2: Model Not Found
```
❌ Model abc-123-def not found
   Please select a valid trained model
```

### Error 3: Invalid File Format
```
❌ Please upload a CSV or Excel file
   Accepted formats: .csv, .xlsx, .xls
```

### Error 4: Empty File
```
❌ No data provided
   Please upload a file with at least one row
```

---

## 🎉 Complete Feature List

### ✅ Implemented
- [x] Model selection from all trained models
- [x] CSV file upload
- [x] Excel file upload
- [x] Drag & drop support
- [x] Column validation
- [x] Categorical encoding
- [x] Classification predictions
- [x] Regression predictions
- [x] Confidence scores
- [x] Class probabilities
- [x] Results table display
- [x] Download as CSV
- [x] Pre-selection via URL
- [x] Navigation from training results
- [x] Navigation from models list
- [x] Loading states
- [x] Error handling
- [x] Responsive design

### 🚀 Ready to Use!
Your users can now complete the entire ML workflow from data upload to predictions!
