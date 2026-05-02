"""FoodX-251 labels and per-100g calories from Food-Recognition-and-Calorie-Estimation/src."""

from __future__ import annotations

import csv
import os
import re
from functools import lru_cache
from pathlib import Path


def chat_bot_root() -> Path:
    env = os.environ.get("CHAT_BOT_CHEF_ROOT", "").strip()
    if env:
        return Path(env)
    # ml-models/food-ai-server -> chat_bot_chef
    return Path(__file__).resolve().parent.parent.parent


def food_recognition_src_dir() -> Path:
    return chat_bot_root() / "Food-Recognition-and-Calorie-Estimation" / "src"


@lru_cache(maxsize=1)
def load_class_names() -> tuple[str, ...]:
    path = food_recognition_src_dir() / "classes_names.txt"
    if not path.is_file():
        raise FileNotFoundError(f"Missing FoodX class list: {path}")
    lines = [ln.strip() for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    return tuple(lines)


_CAL_RE = re.compile(r"(\d+)\s*cal", re.I)


@lru_cache(maxsize=1)
def load_foodx_table() -> tuple[tuple[str, ...], tuple[str, ...], tuple[int, ...]]:
    """Return (snake id per row, display name from CSV, kcal per 100g) — row order matches train labels."""
    names = load_class_names()
    csv_path = food_recognition_src_dir() / "food_estimates_by_gc.csv"
    if not csv_path.is_file():
        raise FileNotFoundError(f"Missing calorie table: {csv_path}")

    display: list[str] = []
    kcals: list[int] = []
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            label = (row.get("Predicted Food Class") or "").strip()
            est = (row.get("Estimated Calories") or "").strip()
            m = _CAL_RE.search(est)
            if not label or not m:
                continue
            display.append(label)
            kcals.append(int(m.group(1)))

    if len(display) != len(names):
        raise ValueError(
            f"food_estimates_by_gc.csv has {len(display)} rows but classes_names.txt has {len(names)} — counts must match."
        )
    return tuple(names), tuple(display), tuple(kcals)


def estimate_macros_from_calories(calories: int) -> tuple[int, int, int]:
    """Rough P/C/F grams for 100g reference (CSV is per 100g); not from pixels."""
    c = max(calories, 1)
    p = max(1, round((c * 0.15) / 4))
    carb = max(1, round((c * 0.50) / 4))
    fat = max(1, round((c * 0.35) / 9))
    return p, carb, fat
