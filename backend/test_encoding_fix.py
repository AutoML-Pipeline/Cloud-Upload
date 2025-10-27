"""
Quick test to verify the encoding performance fix
Tests the batch one-hot encoding optimization
"""
import pandas as pd
import numpy as np
import time
from controllers.feature_engineering.operations import apply_encoding

def test_encoding_performance():
    print("🧪 Testing Encoding Performance Fix\n")
    print("=" * 60)
    
    # Create test dataset with multiple categorical columns
    np.random.seed(42)
    n_rows = 50000
    
    df = pd.DataFrame({
        'category_1': np.random.choice(['A', 'B', 'C', 'D'], n_rows),
        'category_2': np.random.choice(['X', 'Y', 'Z'], n_rows),
        'category_3': np.random.choice(['Red', 'Blue', 'Green', 'Yellow'], n_rows),
        'numeric': np.random.randn(n_rows),
    })
    
    print(f"Dataset: {len(df):,} rows × {len(df.columns)} columns")
    print(f"Categorical columns: {df.select_dtypes(include='object').columns.tolist()}")
    print()
    
    # Test 1: One-hot encoding multiple columns
    print("Test 1: One-Hot Encoding (3 columns)")
    columns_to_encode = ['category_1', 'category_2', 'category_3']
    
    start = time.time()
    result_df, metadata = apply_encoding(df.copy(), columns_to_encode, method='one-hot')
    elapsed = time.time() - start
    
    print(f"✅ Completed in {elapsed:.3f}s")
    print(f"   Original columns: {len(df.columns)}")
    print(f"   Encoded columns: {len(result_df.columns)}")
    print(f"   New columns created: {len(result_df.columns) - len(df.columns)}")
    print(f"   Memory: {result_df.memory_usage(deep=True).sum() / 1024**2:.2f} MB")
    
    # Verify encoding worked
    expected_new_cols = (
        len(df['category_1'].unique()) + 
        len(df['category_2'].unique()) + 
        len(df['category_3'].unique())
    )
    actual_new_cols = len(result_df.columns) - len(df.columns) + len(columns_to_encode)
    
    if actual_new_cols == expected_new_cols:
        print(f"   ✓ Encoding correctness verified")
    else:
        print(f"   ⚠️  Expected {expected_new_cols} new columns, got {actual_new_cols}")
    
    print()
    
    # Test 2: Label encoding
    print("Test 2: Label Encoding (3 columns)")
    
    start = time.time()
    result_df2, metadata2 = apply_encoding(df.copy(), columns_to_encode, method='label')
    elapsed2 = time.time() - start
    
    print(f"✅ Completed in {elapsed2:.3f}s")
    print(f"   All columns are now numeric: {all(pd.api.types.is_numeric_dtype(result_df2[col]) for col in columns_to_encode)}")
    print()
    
    # Performance summary
    print("=" * 60)
    print("📊 Performance Summary:")
    print(f"   One-hot encoding: {elapsed:.3f}s")
    print(f"   Label encoding: {elapsed2:.3f}s")
    
    if elapsed < 0.5:
        print(f"   ✅ PASS: One-hot encoding is fast (< 0.5s)")
    else:
        print(f"   ❌ FAIL: One-hot encoding is slow (> 0.5s)")
        print(f"   🐛 The batch processing fix may not be working correctly")
    
    return elapsed < 0.5

if __name__ == "__main__":
    success = test_encoding_performance()
    exit(0 if success else 1)
