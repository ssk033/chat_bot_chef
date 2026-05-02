"""Create Keras demo weights at ml-models/weights/food_classifier.keras (for Indian 16-class path)."""

from __future__ import annotations

from model_loader import default_weights_path, demo_marker_path, maybe_create_placeholder_weights


def main() -> None:
    maybe_create_placeholder_weights()
    p = default_weights_path()
    m = demo_marker_path()
    print(f"weights: {p} (exists={p.is_file()})")
    print(f"demo marker: {m} (exists={m.is_file()})")


if __name__ == "__main__":
    main()
