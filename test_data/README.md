# Test Data for Prediction Feature

This folder contains sample datasets for testing the model training and prediction workflow.

## 📊 Datasets Included

### 1. Iris Classification Dataset
**Use Case:** Classify iris flower species based on physical measurements

**Training File:** `iris_training.csv` (40 samples)
- **Features:** `sepal_length`, `sepal_width`, `petal_length`, `petal_width`
- **Target:** `species` (setosa, versicolor, virginica)
- **Problem Type:** Multi-class Classification

**Prediction File:** `iris_prediction.csv` (14 samples)
- Same features, no target column
- Expected predictions: Mix of all 3 species

**Expected Results:**
- Accuracy: ~95%+ (this is a very separable dataset)
- Best models: Random Forest, XGBoost, SVM

---

### 2. House Prices Regression Dataset
**Use Case:** Predict house prices based on property features

**Training File:** `house_prices_training.csv` (20 samples)
- **Features:** 
  - `sqft` (square footage)
  - `bedrooms` (number of bedrooms)
  - `bathrooms` (number of bathrooms)
  - `location` (urban/suburban/rural)
  - `age_years` (age of house)
  - `garage` (number of garage spaces)
- **Target:** `price` (in dollars)
- **Problem Type:** Regression

**Prediction File:** `house_prices_prediction.csv` (10 samples)
- Same features, no target column
- Expected predictions: Range from ~$200k to ~$600k

**Expected Results:**
- R² Score: ~0.90+
- Best models: Random Forest, XGBoost, Linear Regression

---

### 3. Customer Churn Classification Dataset
**Use Case:** Predict if a customer will churn (cancel service)

**Training File:** `customer_churn_training.csv` (20 samples)
- **Features:**
  - `customer_id` (identifier)
  - `age` (customer age)
  - `tenure_months` (months as customer)
  - `monthly_charges` (monthly bill)
  - `total_charges` (total spending)
  - `contract_type` (month-to-month, one-year, two-year)
  - `payment_method` (electronic, bank, credit-card)
  - `internet_service` (fiber, dsl, none)
  - `phone_service` (yes/no)
- **Target:** `churn` (yes/no)
- **Problem Type:** Binary Classification

**Prediction File:** `customer_churn_prediction.csv` (8 samples)
- Same features, no target column
- Expected predictions: Mix of yes/no

**Expected Results:**
- Accuracy: ~80-90%
- Best models: Random Forest, XGBoost, Logistic Regression

---

## 🧪 Testing Workflow

### Step 1: Train a Model

1. Go to **Model Training** page
2. Upload training file (e.g., `iris_training.csv`)
3. Select target column (e.g., `species`)
4. Click **Train Models**
5. Wait for training to complete
6. Review results and visualizations

### Step 2: Make Predictions

#### Option A: From Training Results
1. After training completes, click **"Make Predictions with Best Model"** button
2. You'll be redirected to Prediction page with model pre-selected

#### Option B: From Models List
1. Go to **Models** page
2. Click on a trained model
3. Click **"🔮 Make Predictions"** button in model details

### Step 3: Upload Prediction Data

1. Drag & drop or click to upload the corresponding prediction file
2. Verify that the file is loaded (should show row count)
3. Click **"Generate Predictions 🚀"**

### Step 4: Review Results

1. View predictions table with:
   - **Classification:** Prediction, Confidence, Class Probabilities
   - **Regression:** Prediction value
2. Download results as CSV (original data + predictions)

---

## ✅ Expected Behavior

### Column Validation
- ✅ **Pass:** Upload file with exact same columns as training data
- ❌ **Fail:** Upload file missing columns → Shows error "Missing required columns: ..."
- ❌ **Fail:** Upload file with extra columns → Model ignores them (only uses expected columns)

### File Format Support
- ✅ CSV files (`.csv`)
- ✅ Excel files (`.xlsx`, `.xls`)
- ❌ Other formats → Shows error

### Classification Results
```
Row 1: Prediction: setosa, Confidence: 98.5%
       Probabilities: setosa: 98.5%, versicolor: 1.2%, virginica: 0.3%
```

### Regression Results
```
Row 1: Prediction: 325000.00
```

---

## 🔍 Test Scenarios

### ✅ Happy Path Tests

1. **Iris Classification:**
   - Train on `iris_training.csv` → Target: `species`
   - Predict on `iris_prediction.csv`
   - Expected: 14 predictions, high confidence (~95%+)

2. **House Price Regression:**
   - Train on `house_prices_training.csv` → Target: `price`
   - Predict on `house_prices_prediction.csv`
   - Expected: 10 predictions, reasonable prices ($200k-$600k range)

3. **Customer Churn:**
   - Train on `customer_churn_training.csv` → Target: `churn`
   - Predict on `customer_churn_prediction.csv`
   - Expected: 8 predictions (yes/no), confidence scores

### ❌ Error Handling Tests

1. **Missing Columns:**
   - Create a CSV with only 2 columns instead of 4
   - Expected error: "Missing required columns: ..."

2. **Wrong Column Names:**
   - Create a CSV with renamed columns
   - Expected error: "Missing required columns: ..."

3. **Empty File:**
   - Upload an empty CSV
   - Expected error: "No data provided"

4. **Invalid Format:**
   - Try uploading a .txt or .pdf file
   - Expected error: "Please upload a CSV or Excel file"

---

## 📥 Downloaded Results Format

### Classification Example (Iris):
```csv
sepal_length,sepal_width,petal_length,petal_width,prediction,confidence
5.2,3.4,1.4,0.2,setosa,0.9850
6.7,3.1,4.4,1.4,versicolor,0.9200
6.3,2.5,5.0,1.9,virginica,0.9500
```

### Regression Example (House Prices):
```csv
sqft,bedrooms,bathrooms,location,age_years,garage,prediction
1350,2,1,urban,16,0,275000.00
1650,3,2,urban,9,1,335000.00
1950,3,2,suburban,11,1,395000.00
```

---

## 🎯 Performance Benchmarks

Based on these test datasets:

| Dataset | Training Time | Prediction Time | Expected Accuracy |
|---------|--------------|-----------------|-------------------|
| Iris | < 1 second | < 100ms | 95%+ |
| House Prices | < 1 second | < 100ms | R² > 0.90 |
| Customer Churn | < 1 second | < 100ms | 80-90% |

---

## 💡 Tips

1. **Always use the prediction file (without target column)** for predictions
2. **Column order doesn't matter** - backend will reorder to match training
3. **Categorical values must match training data** (e.g., don't use "city" if training used "urban")
4. **For testing column validation**, manually edit a CSV to remove/rename columns
5. **Check downloaded CSV** to verify original data + predictions are combined correctly

---

## 🚀 Ready to Test!

Start with the Iris dataset (simplest) and work your way up to more complex scenarios!
