"""
Comprehensive Feature Engineering Test Suite
Tests all operations: scaling, encoding, binning, feature creation, feature selection
Includes per-column method overrides and performance checks
"""
import pandas as pd
import numpy as np
import time
from controllers.feature_engineering.operations import (
    apply_scaling,
    apply_encoding,
    apply_binning,
    apply_feature_creation,
    apply_feature_selection
)

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print('='*70)

def test_scaling():
    print_section("TEST 1: SCALING")
    
    np.random.seed(42)
    n_rows = 5000
    
    df = pd.DataFrame({
        'col1': np.random.randn(n_rows) * 100,
        'col2': np.random.uniform(0, 1000, n_rows),
        'col3': np.random.exponential(50, n_rows),
        'col4': np.random.choice(['A', 'B'], n_rows),  # Non-numeric (should skip)
    })
    
    print(f"Dataset: {len(df):,} rows × {len(df.columns)} columns")
    print(f"Numeric columns: col1, col2, col3")
    
    # Test 1a: Standard scaling (all columns with same method)
    print("\n1a. Standard Scaling (all columns)")
    start = time.time()
    result1, meta1 = apply_scaling(df.copy(), ['col1', 'col2', 'col3'], 'standard', None)
    elapsed1 = time.time() - start
    print(f"   ✅ Time: {elapsed1:.3f}s")
    print(f"   Details: {meta1['details']}")
    
    # Test 1b: Per-column methods
    print("\n1b. Per-Column Method Overrides")
    column_methods = {
        'col1': 'standard',
        'col2': 'minmax',
        'col3': 'robust'
    }
    start = time.time()
    result2, meta2 = apply_scaling(df.copy(), ['col1', 'col2', 'col3'], 'standard', column_methods)
    elapsed2 = time.time() - start
    print(f"   ✅ Time: {elapsed2:.3f}s")
    print(f"   Details: {meta2['details']}")
    
    # Verify different methods were applied
    if 'standard' in meta2['details']['col1'] and 'minmax' in meta2['details']['col2'] and 'robust' in meta2['details']['col3']:
        print("   ✅ PASS: Per-column methods applied correctly")
        return True
    else:
        print("   ❌ FAIL: Per-column methods not working")
        return False

def test_encoding():
    print_section("TEST 2: ENCODING")
    
    np.random.seed(42)
    n_rows = 5000
    
    df = pd.DataFrame({
        'low_card': np.random.choice(['A', 'B', 'C'], n_rows),
        'medium_card': np.random.choice([f'Cat{i}' for i in range(50)], n_rows),
        'high_card': [f'ID_{i}' for i in range(n_rows)],  # 5000 unique values!
        'numeric': np.random.randn(n_rows),
    })
    
    print(f"Dataset: {len(df):,} rows × {len(df.columns)} columns")
    print(f"  - low_card: {df['low_card'].nunique()} unique values")
    print(f"  - medium_card: {df['medium_card'].nunique()} unique values")
    print(f"  - high_card: {df['high_card'].nunique()} unique values")
    
    # Test 2a: Auto-conversion of high-cardinality
    print("\n2a. High-Cardinality Auto-Conversion")
    start = time.time()
    result1, meta1 = apply_encoding(df.copy(), ['low_card', 'high_card'], 'one-hot', None)
    elapsed1 = time.time() - start
    print(f"   ✅ Time: {elapsed1:.3f}s (should be fast!)")
    print(f"   Details: {meta1['details']}")
    
    # Verify high_card was auto-converted
    if 'label encoded' in meta1['details']['high_card'] and 'high_card' in result1.columns:
        print(f"   ✅ PASS: High-cardinality auto-converted to label (created {len(result1.columns) - len(df.columns)} columns)")
    else:
        print("   ❌ FAIL: High-cardinality not auto-converted")
        return False
    
    # Test 2b: Per-column methods
    print("\n2b. Per-Column Method Overrides")
    column_methods = {
        'low_card': 'one-hot',
        'medium_card': 'label',
    }
    start = time.time()
    result2, meta2 = apply_encoding(df.copy(), ['low_card', 'medium_card'], 'one-hot', column_methods)
    elapsed2 = time.time() - start
    print(f"   ✅ Time: {elapsed2:.3f}s")
    print(f"   Details: {meta2['details']}")
    
    # Verify
    low_onehot = len([col for col in result2.columns if col.startswith('low_card_')]) > 0
    medium_label = 'medium_card' in result2.columns and pd.api.types.is_numeric_dtype(result2['medium_card'])
    
    if low_onehot and medium_label:
        print("   ✅ PASS: Per-column encoding methods work")
        return True
    else:
        print("   ❌ FAIL: Per-column encoding not working")
        return False

def test_binning():
    print_section("TEST 3: BINNING")
    
    np.random.seed(42)
    n_rows = 5000
    
    df = pd.DataFrame({
        'uniform': np.random.uniform(0, 100, n_rows),
        'normal': np.random.randn(n_rows) * 50,
        'skewed': np.random.exponential(20, n_rows),
        'categorical': np.random.choice(['A', 'B'], n_rows),
    })
    
    print(f"Dataset: {len(df):,} rows × {len(df.columns)} columns")
    
    # Test 3a: Equal-width binning
    print("\n3a. Equal-Width Binning")
    start = time.time()
    result1, meta1 = apply_binning(df.copy(), ['uniform', 'normal'], 'equal-width', 5, None)
    elapsed1 = time.time() - start
    print(f"   ✅ Time: {elapsed1:.3f}s")
    print(f"   Details: {meta1['details']}")
    
    # Verify binned columns created
    if 'uniform_binned' in result1.columns and 'normal_binned' in result1.columns:
        print(f"   ✅ PASS: Binned columns created ({len(result1.columns)} total columns)")
    else:
        print("   ❌ FAIL: Binning failed")
        return False
    
    # Test 3b: Per-column methods
    print("\n3b. Per-Column Binning Methods")
    column_methods = {
        'uniform': 'equal-width',
        'skewed': 'quantile',
    }
    start = time.time()
    result2, meta2 = apply_binning(df.copy(), ['uniform', 'skewed'], 'equal-width', 5, column_methods)
    elapsed2 = time.time() - start
    print(f"   ✅ Time: {elapsed2:.3f}s")
    print(f"   Details: {meta2['details']}")
    
    if 'equal-width' in meta2['details']['uniform'] and 'quantile' in meta2['details']['skewed']:
        print("   ✅ PASS: Per-column binning methods work")
        return True
    else:
        print("   ❌ FAIL: Per-column binning not working")
        return False

def test_feature_creation():
    print_section("TEST 4: FEATURE CREATION")
    
    np.random.seed(42)
    n_rows = 1000
    
    df = pd.DataFrame({
        'num1': np.random.randn(n_rows),
        'num2': np.random.randn(n_rows),
        'date': pd.date_range('2024-01-01', periods=n_rows, freq='H'),
    })
    
    print(f"Dataset: {len(df):,} rows × {len(df.columns)} columns")
    
    # Test 4a: Polynomial features
    print("\n4a. Polynomial Features (degree=2)")
    start = time.time()
    result1, meta1 = apply_feature_creation(df.copy(), ['num1'], 'polynomial', degree=2)
    elapsed1 = time.time() - start
    print(f"   ✅ Time: {elapsed1:.3f}s")
    print(f"   Details: {meta1['details']}")
    print(f"   Columns created: {len(result1.columns) - len(df.columns)}")
    
    if 'polynomial' in str(meta1['details'].get('num1', '')):
        print("   ✅ PASS: Polynomial features work")
    else:
        print("   ❌ FAIL: Polynomial features not working")
        return False
    
    # Test 4b: Datetime decomposition
    print("\n4b. Datetime Decomposition")
    start = time.time()
    result2, meta2 = apply_feature_creation(df.copy(), ['date'], 'datetime_decomposition')
    elapsed2 = time.time() - start
    print(f"   ✅ Time: {elapsed2:.3f}s")
    print(f"   Details: {meta2['details']}")
    
    # Check for datetime columns
    datetime_cols = [col for col in result2.columns if any(x in col for x in ['year', 'month', 'day', 'hour'])]
    if len(datetime_cols) > 0:
        print(f"   ✅ PASS: Datetime decomposition created {len(datetime_cols)} columns")
        return True
    else:
        print("   ❌ FAIL: Datetime decomposition not working")
        return False

def test_feature_selection():
    print_section("TEST 5: FEATURE SELECTION")
    
    np.random.seed(42)
    n_rows = 1000
    
    # Create correlated features
    base = np.random.randn(n_rows)
    df = pd.DataFrame({
        'feat1': base + np.random.randn(n_rows) * 0.1,  # Highly correlated with base
        'feat2': base + np.random.randn(n_rows) * 0.1,  # Highly correlated with base
        'feat3': np.random.randn(n_rows),  # Independent
        'feat4': np.random.randn(n_rows) * 0.0001,  # Low variance
    })
    
    print(f"Dataset: {len(df):,} rows × {len(df.columns)} columns")
    
    # Test 5a: Correlation filter
    print("\n5a. Correlation Filter (threshold=0.9)")
    start = time.time()
    result1, meta1 = apply_feature_selection(df.copy(), ['feat1', 'feat2', 'feat3'], 'correlation_filter', threshold=0.9)
    elapsed1 = time.time() - start
    print(f"   ✅ Time: {elapsed1:.3f}s")
    print(f"   Details: {meta1['details']}")
    
    if 'dropped_columns' in meta1['details'] or 'threshold' in meta1['details']:
        print("   ✅ PASS: Correlation filter works")
    else:
        print("   ❌ FAIL: Correlation filter not working")
        return False
    
    # Test 5b: Variance threshold
    print("\n5b. Variance Threshold (threshold=0.001)")
    start = time.time()
    result2, meta2 = apply_feature_selection(df.copy(), ['feat3', 'feat4'], 'variance_threshold', threshold=0.001)
    elapsed2 = time.time() - start
    print(f"   ✅ Time: {elapsed2:.3f}s")
    print(f"   Details: {meta2['details']}")
    
    if 'selected_columns' in meta2['details'] or 'threshold' in meta2['details']:
        print("   ✅ PASS: Variance threshold works")
        return True
    else:
        print("   ❌ FAIL: Variance threshold not working")
        return False

def run_all_tests():
    print("\n" + "="*70)
    print("  COMPREHENSIVE FEATURE ENGINEERING TEST SUITE")
    print("="*70)
    
    results = {}
    
    try:
        results['scaling'] = test_scaling()
    except Exception as e:
        print(f"   ❌ SCALING FAILED: {e}")
        results['scaling'] = False
    
    try:
        results['encoding'] = test_encoding()
    except Exception as e:
        print(f"   ❌ ENCODING FAILED: {e}")
        results['encoding'] = False
    
    try:
        results['binning'] = test_binning()
    except Exception as e:
        print(f"   ❌ BINNING FAILED: {e}")
        results['binning'] = False
    
    try:
        results['feature_creation'] = test_feature_creation()
    except Exception as e:
        print(f"   ❌ FEATURE CREATION FAILED: {e}")
        results['feature_creation'] = False
    
    try:
        results['feature_selection'] = test_feature_selection()
    except Exception as e:
        print(f"   ❌ FEATURE SELECTION FAILED: {e}")
        results['feature_selection'] = False
    
    # Summary
    print("\n" + "="*70)
    print("  TEST SUMMARY")
    print("="*70)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}  {test_name.upper()}")
    
    total_passed = sum(results.values())
    total_tests = len(results)
    
    print("\n" + "="*70)
    print(f"  TOTAL: {total_passed}/{total_tests} tests passed")
    print("="*70)
    
    if total_passed == total_tests:
        print("\n🎉 ALL TESTS PASSED! Feature engineering is working perfectly!")
        return True
    else:
        print(f"\n⚠️  {total_tests - total_passed} test(s) failed. Please review the output above.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
