"""
Test high-cardinality auto-conversion to label encoding
Verifies that columns with >100 unique values are automatically converted to label encoding
"""
import pandas as pd
import numpy as np
import time
from controllers.feature_engineering.operations import apply_encoding

def test_high_cardinality_auto_conversion():
    print("🧪 Testing High-Cardinality Auto-Conversion\n")
    print("=" * 60)
    
    # Create test dataset with high-cardinality column (like an ID)
    np.random.seed(42)
    n_rows = 10000
    
    df = pd.DataFrame({
        'low_cardinality': np.random.choice(['A', 'B', 'C'], n_rows),
        'high_cardinality_id': ['ID_' + str(i) for i in range(n_rows)],  # 10k unique values!
        'numeric': np.random.randn(n_rows),
    })
    
    print(f"Dataset: {len(df):,} rows × {len(df.columns)} columns")
    print(f"  - low_cardinality: {df['low_cardinality'].nunique()} unique values")
    print(f"  - high_cardinality_id: {df['high_cardinality_id'].nunique():,} unique values")
    print()
    
    # Test: Try to one-hot encode both columns (high cardinality should auto-convert)
    print("Test: Attempting one-hot encoding on both columns")
    print("Expected: high_cardinality_id auto-converts to label encoding")
    print()
    
    columns_to_encode = ['low_cardinality', 'high_cardinality_id']
    
    start = time.time()
    result_df, metadata = apply_encoding(
        df.copy(), 
        columns_to_encode, 
        method='one-hot',
        column_methods=None
    )
    elapsed = time.time() - start
    
    print(f"✅ Completed in {elapsed:.2f}s")
    print(f"\n   Original columns: {len(df.columns)}")
    print(f"   Final columns: {len(result_df.columns)}")
    print(f"\n   Encoding details:")
    for col, detail in metadata['details'].items():
        print(f"      - {col}: {detail}")
    print()
    
    # Verify results
    print("=" * 60)
    print("📊 Verification:")
    
    # Check low_cardinality was one-hot encoded
    onehot_cols = [col for col in result_df.columns if col.startswith('low_cardinality_')]
    if len(onehot_cols) > 0:
        print(f"   ✅ low_cardinality: One-hot encoded ({len(onehot_cols)} columns created)")
    else:
        print("   ❌ low_cardinality: One-hot encoding failed")
    
    # Check high_cardinality_id was label encoded (not one-hot)
    if 'high_cardinality_id' in result_df.columns and pd.api.types.is_numeric_dtype(result_df['high_cardinality_id']):
        print(f"   ✅ high_cardinality_id: Auto-converted to label encoding (numeric column)")
    else:
        id_cols = [col for col in result_df.columns if col.startswith('high_cardinality_id_')]
        if len(id_cols) > 0:
            print(f"   ❌ high_cardinality_id: One-hot encoded {len(id_cols)} columns (NOT auto-converted!)")
        else:
            print("   ❌ high_cardinality_id: Encoding failed")
    
    # Performance check
    if elapsed < 1.0:
        print(f"   ✅ Performance: Fast ({elapsed:.2f}s < 1.0s)")
    else:
        print(f"   ⚠️  Performance: Slow ({elapsed:.2f}s > 1.0s)")
    
    print("\n" + "=" * 60)
    
    if elapsed < 1.0 and 'high_cardinality_id' in result_df.columns:
        print("✅ PASS: High-cardinality auto-conversion works!")
        return True
    else:
        print("❌ FAIL: Auto-conversion not working correctly")
        return False

if __name__ == "__main__":
    success = test_high_cardinality_auto_conversion()
    exit(0 if success else 1)
