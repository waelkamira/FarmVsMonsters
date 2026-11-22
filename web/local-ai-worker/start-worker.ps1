$ErrorActionPreference = "Stop"

if (-not $env:SAM2_CONFIG) {
  throw "Set SAM2_CONFIG to the local SAM 2 model YAML before starting the worker."
}
if (-not $env:SAM2_CHECKPOINT) {
  throw "Set SAM2_CHECKPOINT to a locally installed SAM 2 checkpoint before starting the worker."
}
if (-not (Test-Path -LiteralPath $env:SAM2_CONFIG -PathType Leaf)) {
  throw "SAM2_CONFIG file does not exist: $env:SAM2_CONFIG"
}
if (-not (Test-Path -LiteralPath $env:SAM2_CHECKPOINT -PathType Leaf)) {
  throw "SAM2_CHECKPOINT file does not exist: $env:SAM2_CHECKPOINT"
}

python -c "import torch, cv2, sam2; print('PyTorch:', torch.__version__); print('CUDA available:', torch.cuda.is_available()); print('OpenCV:', cv2.__version__)"
if ($LASTEXITCODE -ne 0) {
  throw "Missing Python dependencies. Install PyTorch, official SAM 2, and requirements.txt first."
}

Write-Host "Starting FarmVsMonsters Studio local AI worker on 127.0.0.1:8765"
python (Join-Path $PSScriptRoot "worker.py")
