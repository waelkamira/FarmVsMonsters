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

# Download the small official SAM 2.1 checkpoint and only the PyTorch/safetensors
# files needed by CLIP. Model weights stay outside the repository.
command -v curl >/dev/null || { echo "curl is required. Install it with: sudo apt-get install -y curl"; exit 1; }
MODEL_DIR="${FVM_MODEL_DIR:-$HOME/models}"
CLIP_DIR="${FVM_CLIP_MODEL_DIR:-$MODEL_DIR/clip-vit-base-patch32}"
SAM2_CHECKPOINT="$MODEL_DIR/sam2.1_hiera_tiny.pt"
SAM2_SHA256="7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69"
mkdir -p "$MODEL_DIR" "$CLIP_DIR"

if [ ! -f "$SAM2_CHECKPOINT" ] || [ "$(sha256sum "$SAM2_CHECKPOINT" | awk '{print $1}')" != "$SAM2_SHA256" ]; then
  TEMP_CHECKPOINT="$SAM2_CHECKPOINT.download"
  rm -f "$TEMP_CHECKPOINT"
  curl --fail --location --retry 3 --retry-delay 2 \
    "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt" \
    --output "$TEMP_CHECKPOINT"
  ACTUAL_SHA256="$(sha256sum "$TEMP_CHECKPOINT" | awk '{print $1}')"
  if [ "$ACTUAL_SHA256" != "$SAM2_SHA256" ]; then
    rm -f "$TEMP_CHECKPOINT"
    echo "SAM 2 checkpoint SHA-256 mismatch; refusing to use the downloaded file."
    exit 1
  fi
  mv "$TEMP_CHECKPOINT" "$SAM2_CHECKPOINT"
fi

python - "$CLIP_DIR" <<'PY'
import sys
from huggingface_hub import hf_hub_download

destination = sys.argv[1]
revision = "e4b57025458bf5454b0de44068e7cdce28218bc9"
required_files = (
    "config.json",
    "model.safetensors",
    "preprocessor_config.json",
    "special_tokens_map.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "vocab.json",
    "merges.txt",
)
for filename in required_files:
    print("Preparing local CLIP file:", filename, flush=True)
    hf_hub_download(
        repo_id="openai/clip-vit-base-patch32",
        filename=filename,
        revision=revision,
        local_dir=destination,
    )
PY

echo
echo "SAM 2 Python environment is ready."
echo "Next: place a SAM 2.1 tiny checkpoint at: $HOME/models/sam2.1_hiera_tiny.pt"
echo "Then run: bash \"$WORKER_DIR/start-worker-wsl.sh\""
