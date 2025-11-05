"""
Generate a realistic employee attrition dataset for testing
- 5000 samples
- Multiple features (numeric and categorical)
- Complex relationships (not perfectly separable)
- Missing values
- Expected accuracy: 70-85% (realistic for real-world data)
"""
import pandas as pd
import numpy as np

# Set random seed for reproducibility
np.random.seed(42)

# Generate 5000 samples for employee attrition prediction
n_samples = 5000

print(f"Generating {n_samples} employee records...")

# Generate features
data = {
    'employee_id': range(1, n_samples + 1),
    'age': np.random.randint(22, 65, n_samples),
    'department': np.random.choice(['Sales', 'Engineering', 'HR', 'Marketing', 'Finance', 'Operations', 'IT'], n_samples),
    'job_role': np.random.choice(['Manager', 'Senior', 'Junior', 'Lead', 'Associate', 'Director'], n_samples),
    'years_at_company': np.random.randint(0, 30, n_samples),
    'years_in_role': np.random.randint(0, 20, n_samples),
    'monthly_income': np.random.randint(3000, 15000, n_samples),
    'performance_rating': np.random.choice([1, 2, 3, 4, 5], n_samples, p=[0.05, 0.15, 0.40, 0.30, 0.10]),
    'work_life_balance': np.random.choice([1, 2, 3, 4], n_samples, p=[0.10, 0.25, 0.40, 0.25]),
    'job_satisfaction': np.random.choice([1, 2, 3, 4], n_samples, p=[0.15, 0.25, 0.35, 0.25]),
    'environment_satisfaction': np.random.choice([1, 2, 3, 4], n_samples, p=[0.12, 0.28, 0.35, 0.25]),
    'distance_from_home': np.random.randint(1, 50, n_samples),
    'num_projects': np.random.randint(1, 8, n_samples),
    'avg_monthly_hours': np.random.randint(120, 300, n_samples),
    'promotion_last_5years': np.random.choice([0, 1], n_samples, p=[0.85, 0.15]),
    'salary_hike_percent': np.random.randint(0, 25, n_samples),
    'training_times_last_year': np.random.randint(0, 6, n_samples),
    'stock_option_level': np.random.choice([0, 1, 2, 3], n_samples, p=[0.40, 0.35, 0.15, 0.10]),
}

df = pd.DataFrame(data)

# Create target variable with realistic logic (not perfect separation)
# Higher attrition probability based on multiple factors
attrition_prob = np.zeros(n_samples)

# Factors increasing attrition
attrition_prob += (df['job_satisfaction'] == 1).astype(int) * 0.3
attrition_prob += (df['work_life_balance'] == 1).astype(int) * 0.25
attrition_prob += (df['monthly_income'] < 4000).astype(int) * 0.2
attrition_prob += (df['years_at_company'] < 2).astype(int) * 0.25
attrition_prob += (df['avg_monthly_hours'] > 250).astype(int) * 0.2
attrition_prob += (df['promotion_last_5years'] == 0).astype(int) * 0.15
attrition_prob += (df['performance_rating'] <= 2).astype(int) * 0.2
attrition_prob += (df['distance_from_home'] > 30).astype(int) * 0.1
attrition_prob += (df['num_projects'] > 6).astype(int) * 0.15

# Factors decreasing attrition
attrition_prob -= (df['job_satisfaction'] == 4).astype(int) * 0.2
attrition_prob -= (df['stock_option_level'] >= 2).astype(int) * 0.15
attrition_prob -= (df['years_at_company'] > 10).astype(int) * 0.2
attrition_prob -= (df['salary_hike_percent'] > 18).astype(int) * 0.15

# Add random noise to make it realistic
attrition_prob += np.random.normal(0, 0.1, n_samples)

# Clip probabilities between 0 and 1
attrition_prob = np.clip(attrition_prob, 0, 1)

# Generate attrition based on probability
df['attrition'] = (np.random.random(n_samples) < attrition_prob).astype(int)
df['attrition'] = df['attrition'].map({0: 'No', 1: 'Yes'})

# Add some missing values (realistic scenario)
missing_indices = np.random.choice(n_samples, size=int(n_samples * 0.02), replace=False)
df.loc[missing_indices, 'salary_hike_percent'] = np.nan

missing_indices2 = np.random.choice(n_samples, size=int(n_samples * 0.015), replace=False)
df.loc[missing_indices2, 'num_projects'] = np.nan

print(f"Dataset generated with {len(df)} total samples")
print(f"Features: {len(df.columns)-1} (+ 1 target)")
print(f"Target distribution: {df['attrition'].value_counts().to_dict()}")

# Save training dataset (80%)
train_df = df.sample(frac=0.8, random_state=42)
train_df.to_csv('employee_attrition_training.csv', index=False)
print(f"\n✅ Created employee_attrition_training.csv with {len(train_df)} rows")

# Save prediction dataset (20% - without target)
pred_df = df.drop(train_df.index).drop(columns=['attrition'])
pred_df.to_csv('employee_attrition_prediction.csv', index=False)
print(f"✅ Created employee_attrition_prediction.csv with {len(pred_df)} rows")

print(f"\n📊 Training set target distribution:")
print(train_df['attrition'].value_counts())
print(f"\n💡 Expected model accuracy: 70-85% (realistic for complex data)")
print(f"💡 This dataset has realistic complexity with noise and class imbalance")
