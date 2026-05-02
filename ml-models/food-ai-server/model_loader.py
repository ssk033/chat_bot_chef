"""Load trained Keras model from disk (same architecture as training notebook)."""

from __future__ import annotations

import logging
import os
import threading
from pathlib import Path

_MODEL = None
_LOAD_LOCK = threading.Lock()
_LOG = logging.getLogger("food_ai")


def default_weights_path() -> Path:
    root = Path(__file__).resolve().parent.parent
    override = os.environ.get("FOOD_MODEL_PATH")
    if override:
        return Path(override)
    return root / "weights" / "food_classifier.keras"


def demo_marker_path() -> Path:
    """Present when weights are an auto / manual demo (head not trained on food)."""

    return default_weights_path().parent / ".food_classifier_demo"


def is_demo_model() -> bool:
    return demo_marker_path().is_file()


def build_model_architecture():
    import tensorflow as tf

    pretrained = tf.keras.applications.MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights="imagenet",
        pooling="avg",
    )
    pretrained.trainable = False
    inputs = pretrained.input
    x = tf.keras.layers.Dense(128, activation="relu")(pretrained.output)
    x = tf.keras.layers.Dense(128, activation="relu")(x)
    outputs = tf.keras.layers.Dense(16, activation="softmax")(x)
    return tf.keras.Model(inputs=inputs, outputs=outputs)


def maybe_create_placeholder_weights() -> None:
    """Save an untrained model at default path so /predict returns 200. Opt out via FOOD_AI_DISABLE_AUTO_STUB=1."""

    if os.environ.get("FOOD_AI_DISABLE_AUTO_STUB") == "1":
        return

    path = default_weights_path()
    if path.is_file():
        return

    marker = demo_marker_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    _LOG.warning(
        "Food AI: no model at %s — saving demo placeholder on first load (downloads MobileNet ~14MB once). "
        "Train indian-food-classifier notebook and replace file for accuracy. Set FOOD_AI_DISABLE_AUTO_STUB=1 to keep 503 instead.",
        path,
    )

    model = build_model_architecture()
    model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])
    model.save(path)
    marker.write_text(
        "Untrained classifier (bootstrap). Train with indian-food-classifier/train_indian_food_mobilenet.ipynb.",
        encoding="utf-8",
    )


def load_model():
    global _MODEL
    if _MODEL is not None:
        return _MODEL

    with _LOAD_LOCK:
        if _MODEL is not None:
            return _MODEL

        path = default_weights_path()
        if not path.is_file():
            maybe_create_placeholder_weights()
        if not path.is_file():
            return None

        import tensorflow as tf

        try:
            _MODEL = tf.keras.models.load_model(path)
        except Exception:
            m = build_model_architecture()
            m.load_weights(path)
            _MODEL = m
        return _MODEL


def preload_model():
    load_model()
