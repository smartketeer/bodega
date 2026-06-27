param (
    [string]$Server = "u830453162@194.164.74.81",
    [string]$Port = "65002",
    [string]$RemotePath = "domains/bodega.boutique-pos.com/public_html"
)

Write-Host "Starting Deployment Process..." -ForegroundColor Cyan

# 1. Build the frontend assets locally
Write-Host "Building frontend assets (npm run build)..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Aborting deployment." -ForegroundColor Red
    exit 1
}

# 2. Push code to GitHub
Write-Host "Pushing code to GitHub..." -ForegroundColor Yellow
git add .
git commit -m "deploy update"
git push

# 3. Upload the frontend build to server
Write-Host "Uploading public/build folder to server..." -ForegroundColor Yellow
scp -P $Port -r public/build "${Server}:${RemotePath}/public/"

# 4. Pull latest code on the server
Write-Host "Updating backend files on server via Git..." -ForegroundColor Yellow
ssh -p $Port $Server "cd ${RemotePath} && git pull origin main"

Write-Host "Deployment Complete!" -ForegroundColor Green
