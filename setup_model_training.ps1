# Quick setup script for Model Training feature (Windows PowerShell)

Write-Host "🚀 Setting up Model Training & Selection Feature..." -ForegroundColor Cyan
Write-Host ""

# Navigate to backend
Set-Location -Path ".\backend"

Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
pip install xgboost==2.1.3 lightgbm==4.5.0 joblib==1.4.2

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start backend:  uvicorn main:app --reload --host 0.0.0.0 --port 8000"
Write-Host "  2. Start frontend: cd ..\frontend; npm run dev"
Write-Host "  3. Open browser:   http://localhost:5173/model-training"
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  - Feature docs: MODEL_TRAINING_FEATURE.md"
Write-Host "  - Summary:      IMPLEMENTATION_SUMMARY.md"
Write-Host ""
Write-Host "🎉 Happy model training!" -ForegroundColor Magenta
