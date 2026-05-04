"""Approximate per-serving values for Indian dishes (from notebook calories + rough macros)."""

from typing import TypedDict


class Nutrition(TypedDict):
    calories: int
    protein_g: int
    carbs_g: int
    fats_g: int


# Calories aligned with train_indian_food_mobilenet notebook; macros are ballpark estimates per typical serving.
NUTRITION_BY_DISH: dict[str, Nutrition] = {
    "AlooParatha": {"calories": 177, "protein_g": 5, "carbs_g": 24, "fats_g": 7},
    "Biryani": {"calories": 290, "protein_g": 12, "carbs_g": 38, "fats_g": 10},
    "ButterChicken": {"calories": 570, "protein_g": 35, "carbs_g": 18, "fats_g": 38},
    "CholeBhature": {"calories": 450, "protein_g": 14, "carbs_g": 55, "fats_g": 18},
    "DalMakhani": {"calories": 278, "protein_g": 11, "carbs_g": 28, "fats_g": 14},
    "Dhokla": {"calories": 215, "protein_g": 6, "carbs_g": 32, "fats_g": 7},
    "Dosa": {"calories": 51, "protein_g": 2, "carbs_g": 8, "fats_g": 1},
    "GulabJamun": {"calories": 149, "protein_g": 3, "carbs_g": 22, "fats_g": 6},
    "Idli": {"calories": 90, "protein_g": 3, "carbs_g": 18, "fats_g": 1},
    "Jalebi": {"calories": 300, "protein_g": 4, "carbs_g": 52, "fats_g": 9},
    "Naan": {"calories": 185, "protein_g": 6, "carbs_g": 28, "fats_g": 6},
    "PaneerTikka": {"calories": 278, "protein_g": 20, "carbs_g": 10, "fats_g": 18},
    "PaniPuri": {"calories": 36, "protein_g": 1, "carbs_g": 6, "fats_g": 1},
    "Rasmalai": {"calories": 331, "protein_g": 8, "carbs_g": 38, "fats_g": 16},
    "Samosas": {"calories": 308, "protein_g": 8, "carbs_g": 32, "fats_g": 16},
    "VadaPav": {"calories": 197, "protein_g": 6, "carbs_g": 28, "fats_g": 7},
}


def nutrition_for_dish(dish: str) -> Nutrition:
    return NUTRITION_BY_DISH.get(
        dish,
        {"calories": 0, "protein_g": 0, "carbs_g": 0, "fats_g": 0},
    )
