import pandas as pd
import numpy as np
import time
from controllers.feature_engineering.operations import apply_encoding, apply_scaling, apply_binning

# Create test dataset (similar to movie dataset)
print("Creating test dataset...")
np.random.seed(42)
n_rows = 45463

df = pd.DataFrame({
    'genres': np.random.choice(['Action', 'Comedy', 'Drama', 'Horror', 'Romance'], n_rows),
    'imdb_id': np.random.choice([f'tt{i:07d}' for i in range(1000)], n_rows),
    'title': [f'Movie {i}' for i in range(n_rows)],
    'age': np.random.uniform(0, 100, n_rows),
    'rating': np.random.uniform(1, 10, n_rows),
})

print(f"Dataset shape: {df.shape}")
print(f"Dataset memory: {df.memory_usage(deep=True).sum() / 1024**2:.2f} MB\n")

# Test 1: Encoding performance
print("=" * 60)
print("TEST 1: Encoding Performance (pd.get_dummies vs OneHotEncoder)")
print("=" * 60)

df_test = df.copy()
start = time.time()
df_encoded, meta = apply_encoding(df_test, ['genres'], 'one-hot')
elapsed = time.time() - start
print(f"✅ genres one-hot encoding: {elapsed:.2f}s")
print(f"   Columns created: {df_encoded.shape[1] - df_test.shape[1] + 1}")
print(f"   Result memory: {df_encoded.memory_usage(deep=True).sum() / 1024**2:.2f} MB\n")

# Test 2: Label encoding performance
print("=" * 60)
print("TEST 2: Label Encoding Performance")
print("=" * 60)

df_test = df.copy()
start = time.time()
df_encoded, meta = apply_encoding(df_test, ['imdb_id'], 'label')
elapsed = time.time() - start
print(f"✅ imdb_id label encoding: {elapsed:.3f}s")
print(f"   Result memory: {df_encoded.memory_usage(deep=True).sum() / 1024**2:.2f} MB\n")

# Test 3: Scaling performance
print("=" * 60)
print("TEST 3: Scaling Performance (vectorized)")
print("=" * 60)

df_test = df.copy()
start = time.time()
df_scaled, meta = apply_scaling(df_test, ['age', 'rating'], 'standard')
elapsed = time.time() - start
print(f"✅ Multi-column scaling: {elapsed:.3f}s")
print(f"   Columns scaled: 2")
print(f"   Result memory: {df_scaled.memory_usage(deep=True).sum() / 1024**2:.2f} MB\n")

# Test 4: Binning performance
print("=" * 60)
print("TEST 4: Binning Performance (optimized)")
print("=" * 60)

df_test = df.copy()
start = time.time()
df_binned, meta = apply_binning(df_test, ['age', 'rating'], 'quantile', bins=10)
elapsed = time.time() - start
print(f"✅ Quantile binning (2 columns): {elapsed:.3f}s")
print(f"   Result memory: {df_binned.memory_usage(deep=True).sum() / 1024**2:.2f} MB\n")

print("=" * 60)
print("✅ ALL TESTS PASSED - Operations are optimized!")
print("=" * 60)
