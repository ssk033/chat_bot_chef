"""
Bootstrap a local ViT with 251 classes (FoodX label count) for pipeline testing.

The classifier head is randomly initialized on top of google/vit-base-patch16-224 weights.
Predictions are not meaningful until you replace this folder with a fine-tuned checkpoint
(e.g. export from Food-Recognition-and-Calorie-Estimation notebooks).

Usage (from chat_bot_chef, with .venv-food-ai activated):
  python init_demo_foodx.py
  # or (cwd ml-models/food-ai-server): npm run food-ai:init-demo-foodx
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def _root() -> Path:
    env = os.environ.get("CHAT_BOT_CHEF_ROOT", "").strip()
    if env:
        return Path(env)
    return Path(__file__).resolve().parent.parent.parent


def main() -> int:
    parser = argparse.ArgumentParser(description="Save a 251-class ViT demo checkpoint for FoodX pipeline.")
    parser.add_argument(
        "--out",
        default="",
        help="Output directory (default: Food-Recognition-and-Calorie-Estimation/models/vit-foodx251)",
    )
    args = parser.parse_args()

    root = _root()
    default_out = root / "Food-Recognition-and-Calorie-Estimation" / "models" / "vit-foodx251"
    out_dir = Path(args.out) if args.out.strip() else default_out
    out_dir.mkdir(parents=True, exist_ok=True)

    from foodx_data import load_class_names

    try:
        from transformers import ViTConfig, ViTForImageClassification, ViTImageProcessor  # noqa: WPS433
    except ImportError:
        print("Install PyTorch transformers stack first:", file=sys.stderr)
        print("  pip install -r ml-models/food-ai-server/requirements.foodx.txt", file=sys.stderr)
        return 1

    names = load_class_names()
    n = len(names)
    id2label = {str(i): names[i] for i in range(n)}
    label2id = {names[i]: i for i in range(n)}

    base_id = os.environ.get("FOODX_DEMO_BASE_MODEL", "google/vit-base-patch16-224")
    processor = ViTImageProcessor.from_pretrained(base_id)
    cfg = ViTConfig.from_pretrained(base_id, num_labels=n, id2label=id2label, label2id=label2id)

    print(f"Loading base {base_id} and resizing classifier to num_labels={n}…")
    model = ViTForImageClassification.from_pretrained(base_id, config=cfg, ignore_mismatched_sizes=True)

    model.save_pretrained(str(out_dir))
    processor.save_pretrained(str(out_dir))
    marker = out_dir / ".foodx_demo"
    marker.write_text(
        "Demo ViT: classification head not trained on FoodX. Replace with fine-tuned weights for real accuracy.",
        encoding="utf-8",
    )
    print(f"Wrote demo FoodX ViT to: {out_dir}")
    print("Marker:", marker)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
