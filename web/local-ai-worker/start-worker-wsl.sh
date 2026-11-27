#!/usr/bin/env bash
set -euo pipefail

WORKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="${FVM_AI_VENV:-$HOME/.venvs/fvm-studio-ai}"
SAM2_DIR="${SAM2_REPO_DIR:-$HOME/.cache/fvm-sam2}"

export SAM2_CONFIG="${SAM2_CONFIG:-$SAM2_DIR/configs/sam2.1/sam2.1_hiera_t.yaml}"
export SAM2_CHECKPOINT="${SAM2_CHECKPOINT:-$HOME/models/sam2.1_hiera_tiny.pt}"
export FVM_AI_WORKER_PORT="${FVM_AI_WORKER_PORT:-8765}"

[ -f "$ENV_DIR/bin/activate" ] || { echo "Worker environment missing. Run setup-wsl.sh first."; exit 1; }
[ -f "$SAM2_CONFIG" ] || { echo "SAM2 config missing: $SAM2_CONFIG"; exit 1; }
[ -f "$SAM2_CHECKPOINT" ] || { echo "SAM2 checkpoint missing: $SAM2_CHECKPOINT"; exit 1; }

source "$ENV_DIR/bin/activate"
python -c 'import torch, cv2, sam2; print("PyTorch:", torch.__version__); print("CUDA available:", torch.cuda.is_available()); print("OpenCV:", cv2.__version__)'
exec python "$WORKER_DIR/worker.py"
