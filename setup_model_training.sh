#!/bin/bash
# Quick setup script for Model Training feature

echo "🚀 Setting up Model Training & Selection Feature..."
echo ""

# Navigate to backend
cd backend

echo "📦 Installing Python dependencies..."
pip install xgboost==2.1.3 lightgbm==4.5.0 joblib==1.4.2

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Start backend:  uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo "  2. Start frontend: cd ../frontend && npm run dev"
echo "  3. Open browser:   http://localhost:5173/model-training"
echo ""
echo "📚 Documentation:"
echo "  - Feature docs: MODEL_TRAINING_FEATURE.md"
echo "  - Summary:      IMPLEMENTATION_SUMMARY.md"
echo ""
echo "🎉 Happy model training!"
