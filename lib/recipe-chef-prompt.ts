/** Instruction for recipe LLM responses (RAG / future Gemini enhancement). */
export const RECIPE_CHEF_JSON_INSTRUCTION = `Return recipes as valid JSON only. Do not use markdown, bullet lists, or prose outside the JSON object.

Use exactly this shape:
{
  "intro": "optional short message to the user",
  "recipes": [
    {
      "title": "Chicken Curry",
      "ingredients": ["500g chicken", "2 onions", "2 tomatoes"],
      "instructions": ["Heat oil", "Add onions", "Add chicken", "Simmer for 20 minutes"],
      "servings": 5,
      "cuisine": "Indian"
    }
  ]
}

Rules:
- One object per recipe in the recipes array.
- Never combine multiple recipes into one object.
- ingredients and instructions must be JSON arrays of strings.
- Return only the JSON object, with no code fences or extra text.`;
