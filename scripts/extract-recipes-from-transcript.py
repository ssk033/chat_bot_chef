#!/usr/bin/env python3
"""One-off: extract recipe JSON array from agent transcript user message."""
import json
import re
import sys
from pathlib import Path

TRANSCRIPT = Path(
    r"C:\Users\Sanidhya Singh\.cursor\projects\d-miniproject-chat-bot-chef\agent-transcripts"
    r"\c8aea72f-25c5-4b23-adf1-836d65a79b56\c8aea72f-25c5-4b23-adf1-836d65a79b56.jsonl"
)
OUT = Path(__file__).resolve().parent.parent / "dataset" / "recipes-export.json"


def main() -> None:
    raw = None
    with TRANSCRIPT.open(encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            if obj.get("role") != "user":
                continue
            text = obj["message"]["content"][0]["text"]
            if '"id": 5003' in text and "No-Bake Nut Cookies" in text:
                raw = text
                break

    if not raw:
        print("Recipe JSON not found in transcript", file=sys.stderr)
        sys.exit(1)

    if raw.startswith("<user_query>"):
        raw = raw[len("<user_query>") :].lstrip()

    task_idx = raw.find("  TASK:")
    if task_idx != -1:
        raw = raw[:task_idx].rstrip()

    raw = re.sub(r"\bNaN\b", "null", raw)
    data = json.loads(raw)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(data)} recipes to {OUT}")


if __name__ == "__main__":
    main()
