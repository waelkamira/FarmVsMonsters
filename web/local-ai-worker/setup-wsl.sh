#!/usr/bin/env bash
set -euo pipefail

WORKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="${FVM_AI_VENV:-$HOME/.venvs/fvm-studio-ai}"
SAM2_DIR="${SAM2_REPO_DIR:-$HOME/.cache/fvm-sam2}"
TORCH_INDEX_URL="${FVM_TORCH_INDEX_URL:-https://download.pytorch.org/whl/cpu}"

command -v python3 >/dev/null || { echo "Python 3 is required inside WSL Ubuntu."; exit 1; }
command -v git >/dev/null || { echo "Git is required inside WSL Ubuntu."; exit 1; }
python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3,10) else 1)' || {
  echo "Python 3.10 or newer is required."; exit 1;
}

mkdir -p "$(dirname "$ENV_DIR")" "$(dirname "$SAM2_DIR")"
python3 -m venv "$ENV_DIR"
source "$ENV_DIR/bin/activate"
python -m pip install --upgrade pip

if ! python -c 'import torch, torchvision' >/dev/null 2>&1; then
  echo "Installing CPU PyTorch. For NVIDIA CUDA, install the matching PyTorch build first using https://pytorch.org/get-started/locally/ and set FVM_TORCH_INDEX_URL accordingly."
  python -m pip install torch torchvision --index-url "$TORCH_INDEX_URL"
fi

if [ ! -d "$SAM2_DIR/.git" ]; then
  git clone --depth 1 https://github.com/facebookresearch/sam2.git "$SAM2_DIR"
fi

# Official SAM 2 guidance recommends WSL/Ubuntu on Windows. Skip the optional
# CUDA extension for a reliable CPU-capable setup; masks remain fully usable.
SAM2_BUILD_CUDA=0 python -m pip install -e "$SAM2_DIR"
python -m pip install -r "$WORKER_DIR/requirements.txt"

echo
echo "SAM 2 Python environment is ready."
echo "Next: place a SAM 2.1 tiny checkpoint at: $HOME/models/sam2.1_hiera_tiny.pt"
echo "Then run: bash \"$WORKER_DIR/start-worker-wsl.sh\""
