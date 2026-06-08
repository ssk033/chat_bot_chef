"""Typical single-plate macros — overrides per-100g FoodX estimates and low-protein lookups."""

from __future__ import annotations

import re
from typing import TypedDict

from nutrition_map import Nutrition


class _Rule(TypedDict):
    patterns: tuple[re.Pattern[str], ...]
    nutrition: Nutrition


_RULES: tuple[_Rule, ...] = (
    {
        "patterns": (
            re.compile(r"biryani", re.I),
            re.compile(r"hyderabadi", re.I),
            re.compile(r"pulao", re.I),
            re.compile(r"pilaf", re.I),
        ),
        "nutrition": {"calories": 520, "protein_g": 30, "carbs_g": 58, "fats_g": 18},
    },
    {
        "patterns": (re.compile(r"butter\s*chicken", re.I), re.compile(r"murgh\s*makhani", re.I)),
        "nutrition": {"calories": 480, "protein_g": 32, "carbs_g": 14, "fats_g": 32},
    },
    {
        "patterns": (re.compile(r"paneer\s*tikka", re.I),),
        "nutrition": {"calories": 320, "protein_g": 22, "carbs_g": 12, "fats_g": 20},
    },
)


def reference_nutrition_for_label(label: str) -> Nutrition | None:
    name = (label or "").strip()
    if not name:
        return None
    for rule in _RULES:
        if any(p.search(name) for p in rule["patterns"]):
            return dict(rule["nutrition"])
    return None


def _protein_calorie_share(protein_g: int, calories: int) -> float:
    if calories <= 0:
        return 0.0
    return (protein_g * 4) / calories


def reconcile_with_reference(label: str, macros: Nutrition) -> tuple[Nutrition, bool]:
    ref = reference_nutrition_for_label(label)
    if not ref:
        return macros, False

    p = int(macros["protein_g"])
    c = int(macros["calories"])
    protein_low = p < ref["protein_g"] * 0.6
    calories_low = c > 0 and c < ref["calories"] * 0.55
    share_low = c > 80 and _protein_calorie_share(p, c) < 0.12

    if protein_low or calories_low or share_low:
        return ref, True
    return macros, False
