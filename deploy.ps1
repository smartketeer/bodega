param (
    [string]$Server = "u830453162@194.164.74.81",
    [string]$Port = "65002"
)

Write-Host "🚀 Starting Deployment Process..." -ForegroundColor Cyan

# 1. Build the frontend assets locally
Write-Host "📦 Building frontend assets (npm run build)..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Aborting deployment." -ForegroundColor Red
    exit 1
}

# 2. Upload the frontend build directly to public_html
Write-Host "🌐 Uploading public/build folder to public_html..." -ForegroundColor Yellow
scp -P $Port -r public/build $Server`:public_html/

# 3. Trigger Git Pull on the server backend (bodega_app)
Write-Host "⚙️ Updating backend files in bodega_app via Git..." -ForegroundColor Yellow
ssh -p $Port $Server "cd bodega_app && git pull origin main && composer install --no-dev --optimize-autoloader"

Write-Host "✅ Deployment Complete! Your live server is now up to date." -ForegroundColor Green
