"""
Test per-column encoding methods feature
Verifies that column_methods parameter correctly overrides default method
"""
import pandas as pd
import numpy as np
from controllers.feature_engineering.operations import apply_encoding

def test_per_column_encoding():
    print("🧪 Testing Per-Column Encoding Methods\n")
    print("=" * 60)
    
    # Create test dataset with multiple categorical columns
    np.random.seed(42)
    n_rows = 1000
    
    df = pd.DataFrame({
        'category_A': np.random.choice(['Cat', 'Dog', 'Bird'], n_rows),
        'category_B': np.random.choice(['Red', 'Blue', 'Green', 'Yellow'], n_rows),
        'category_C': np.random.choice(['Small', 'Medium', 'Large'], n_rows),
        'numeric': np.random.randn(n_rows),
    })
    
    print(f"Dataset: {len(df):,} rows × {len(df.columns)} columns")
    print(f"Categorical columns: {df.select_dtypes(include='object').columns.tolist()}")
    print()
    
    # Test 1: All columns with same method (one-hot)
    print("Test 1: Default method (one-hot for all)")
    columns_to_encode = ['category_A', 'category_B', 'category_C']
    
    result_df1, metadata1 = apply_encoding(
        df.copy(), 
        columns_to_encode, 
        method='one-hot',
        column_methods=None
    )
    
    print(f"✅ Original columns: {len(df.columns)}")
    print(f"   Encoded columns: {len(result_df1.columns)}")
    print(f"   Details: {metadata1['details']}")
    print()
    
    # Test 2: Mixed methods per column
    print("Test 2: Per-column method overrides")
    column_methods = {
        'category_A': 'label',      # Override to label encoding
        'category_B': 'one-hot',    # Explicitly one-hot
        'category_C': 'label'       # Override to label encoding
    }
    
    result_df2, metadata2 = apply_encoding(
        df.copy(),
        columns_to_encode,
        method='one-hot',  # Default method
        column_methods=column_methods
    )
    
    print(f"✅ Applied methods:")
    print(f"   - category_A: label encoding (overridden)")
    print(f"   - category_B: one-hot encoding (explicit)")
    print(f"   - category_C: label encoding (overridden)")
    print(f"\n   Original columns: {len(df.columns)}")
    print(f"   Encoded columns: {len(result_df2.columns)}")
    print(f"   Details: {metadata2['details']}")
    
    # Verify results
    print("\n" + "=" * 60)
    print("📊 Verification:")
    
    # Check category_A is label encoded (should be numeric, not one-hot)
    if 'category_A' in result_df2.columns and pd.api.types.is_numeric_dtype(result_df2['category_A']):
        print("   ✅ category_A: Label encoded correctly (numeric column)")
    else:
        print("   ❌ category_A: Label encoding failed")
    
    # Check category_B is one-hot encoded (should create multiple columns)
    one_hot_cols_B = [col for col in result_df2.columns if col.startswith('category_B_')]
    if len(one_hot_cols_B) > 0 and 'category_B' not in result_df2.columns:
        print(f"   ✅ category_B: One-hot encoded correctly ({len(one_hot_cols_B)} new columns)")
    else:
        print("   ❌ category_B: One-hot encoding failed")
    
    # Check category_C is label encoded
    if 'category_C' in result_df2.columns and pd.api.types.is_numeric_dtype(result_df2['category_C']):
        print("   ✅ category_C: Label encoded correctly (numeric column)")
    else:
        print("   ❌ category_C: Label encoding failed")
    
    print()
    
    # Test 3: Partial override (some columns use default)
    print("Test 3: Partial override (mix of default and override)")
    column_methods_partial = {
        'category_A': 'label',  # Override only this one
    }
    
    result_df3, metadata3 = apply_encoding(
        df.copy(),
        columns_to_encode,
        method='one-hot',  # Default for category_B and category_C
        column_methods=column_methods_partial
    )
    
    print(f"   category_A: {metadata3['details'].get('category_A')}")
    print(f"   category_B: {metadata3['details'].get('category_B')}")
    print(f"   category_C: {metadata3['details'].get('category_C')}")
    
    # Verify
    is_A_label = 'category_A' in result_df3.columns and pd.api.types.is_numeric_dtype(result_df3['category_A'])
    is_B_onehot = len([col for col in result_df3.columns if col.startswith('category_B_')]) > 0
    is_C_onehot = len([col for col in result_df3.columns if col.startswith('category_C_')]) > 0
    
    if is_A_label and is_B_onehot and is_C_onehot:
        print("   ✅ PASS: Partial override works correctly")
    else:
        print("   ❌ FAIL: Partial override not working")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    
    return True

if __name__ == "__main__":
    test_per_column_encoding()
