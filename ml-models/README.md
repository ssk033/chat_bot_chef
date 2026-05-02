# ML models for chat_bot_chef

## Food Tracker (dashboard → **Analyze photo**)

The API chooses a backend automatically (**`FOOD_AI_BACKEND`** default **`auto`**):

| Condition | Backend |
|-----------|---------|
| `Food-Recognition-and-Calorie-Estimation/models/vit-foodx251/config.json` exists (or **`FOODX_HF_MODEL_ID`** is set) and PyTorch deps are installed | **ViT / FoodX-251** (251 classes); kcal per 100 g from **`food_estimates_by_gc.csv`** |
| Otherwise | **Keras MobileNetV2** (16 Indian dishes) + **`nutrition_map.py`** |

- Force **`FOOD_AI_BACKEND=keras`** or **`foodx`** if you need one path only.
- **FoodX deps:** **`requirements.foodx.txt`** (installed by **`npm run food-ai:venv`** / **`food-ai:venv:win`**). Demo ViT checkpoint: **`npm run food-ai:init-demo-foodx`** (writes **`vit-foodx251/`** + **`.foodx_demo`** marker — untrained head until you swap in fine-tuned weights).

### Keras (16-class Indian) path

1. Train with **`indian-food-classifier/train_indian_food_mobilenet.ipynb`** and run the **export** cells at the end to save **`food_classifier.keras`**.
2. Place the trained file here: **`ml-models/weights/food_classifier.keras`** (folder is tracked; the `.keras` file is gitignored).  
   Delete **`ml-models/weights/.food_classifier_demo`** if it exists (otherwise the app stays in demo mode after you drop in real weights).

   **No notebook yet / just testing the pipeline:**

   ```bash
   npm run food-ai:init-demo-model
   ```

   Restart **`npm run food-ai:dev`** after. Predictions use a **random, untrained** head until you train and replace the file.

   If you skip that command, **`npm run food-ai:dev`** will still succeed: on the **first predict** request the server saves the same demo file automatically (first hit may delay while TensorFlow pulls MobileNet). Set **`FOOD_AI_DISABLE_AUTO_STUB=1`** only if you want a hard failure until real weights exist.

3. Python deps (**TensorFlow has no wheels for Python 3.13 / 3.14** yet — if `python --version` shows 3.13+, skip using that interpreter for ML).

   If **`py -3.12`** says **“No suitable Python runtime”**, install 3.12 first (AMD64):

   ```bat
   winget install --id Python.Python.3.12 -e --source winget
   ```

   Close the terminal, open a new one, then run the npm script below.

   If the script still cannot find 3.12 but you installed it manually, point to the executable (Git Bash):

   ```bash
   export FOOD_AI_PYTHON312="/c/Users/YourName/AppData/Local/Programs/Python/Python312/python.exe"
   npm run food-ai:venv
   ```

   Easiest (**Windows**):

   ```bat
   npm run food-ai:venv:win
   ```

   (**Git Bash** / macOS / Linux bash:)

   ```bash
   npm run food-ai:venv
   ```

   That creates **`chat_bot_chef/.venv-food-ai`** (Python **3.12**) and installs `requirements.txt` + **`requirements.tensorflow.txt`** + **`requirements.foodx.txt`**.

   Manual equivalent:

   ```bash
   py -3.12 -m venv .venv-food-ai
   .venv-food-ai\\Scripts\\activate    # Windows; on Unix: source .venv-food-ai/bin/activate
   python -m pip install --upgrade pip
   pip install -r ml-models/food-ai-server/requirements.txt
   pip install -r ml-models/food-ai-server/requirements.tensorflow.txt
   pip install -r ml-models/food-ai-server/requirements.foodx.txt
   ```

   `npm run food-ai:dev` automatically uses `.venv-food-ai` when it exists. Override with **`FOOD_AI_PYTHON_EXE`** if needed.

   To upgrade pip in a system install (`ERROR: To modify pip...`): use **`python.exe -m pip install --upgrade pip`** (paths may differ — avoid mixing `--user` with base Python installs if that errors).
4. Start the CNN API from the repo root:

   ```bash
   npm run food-ai:dev
   ```

   (Runs `uvicorn` on **`http://127.0.0.1:8765`**. Override with **`FOOD_AI_SERVICE_URL`** in the Next app environment if hosted elsewhere.)

5. Run the Next app (`npm run dev`). Open **Dashboard → Food Tracker**, upload an image.

With the **keras** backend, the model predicts one of **16 Indian dishes**; macros come from **`food-ai-server/nutrition_map.py`**. With **foodx**, the model predicts a **FoodX-251** label; calories follow **`Food-Recognition-and-Calorie-Estimation/src/food_estimates_by_gc.csv`** (macros are a coarse split—not regressed from pixels).

## `indian-food-classifier/`

- **`train_indian_food_mobilenet.ipynb`** — **MobileNetV2 + softmax (16)** on **[Kaggle indian-food-16](https://www.kaggle.com/datasets/aryan401/indian-food-16)**.

## `food-ai-server/`

- **`app.py`** — FastAPI **`POST /predict`** (multipart field **`image`**) and **`GET /health`** (response includes **`backend`**: **`keras`** \| **`foodx`**).
- **`nutrition_map.py`** — Nutrition lookup for the Keras backend.
- **`foodx_engine.py`** / **`foodx_data.py`** — ViT inference and FoodX label + calorie alignment.

## Not the same as PyTorch checkpoints

| What | This stack | PyTorch `.pth` (e.g. ResNet) |
|------|------------|-----------------------------|
| Framework | TensorFlow / Keras | PyTorch |
| Task | Dish **classification** (16 classes) | Depends on training |
| Data | indian-food-16 | Your dataset |

Separate PyTorch workflows need their own **`infer`** script — Keras notebooks will not load **`.pth`** files.
