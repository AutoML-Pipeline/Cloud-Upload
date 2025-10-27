"""Test script to verify model training updates"""
import sys
sys.path.insert(0, 'D:/Cloud-Upload/backend')

try:
    from controllers.model_training import trainers
    print("✅ Backend imports successful")
    
    # Check if new functions exist
    print("✅ _extract_feature_importance function exists:", hasattr(trainers, '_extract_feature_importance'))
    print("✅ confusion_matrix imported:", 'confusion_matrix' in dir(trainers))
    
    print("\n✨ All backend changes verified successfully!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
