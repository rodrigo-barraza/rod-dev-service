/**
 * Style presets for Stable Diffusion prompt augmentation.
 * Each entry provides prompt/negativePrompt fragments that are
 * prepended to the user's prompt when a style is selected.
 */
export const STYLE_COLLECTION = [
  { prompt: "", label: "None", value: "none" },
  {
    prompt: "a close-up photograph portrait",
    negativePrompt: "disfigured, ugly, deformed, illustration, drawing, anime",
    label: "Photograph",
    value: "photograph",
  },
  {
    prompt: "a vector illustration",
    negativePrompt: "disfigured, ugly, deformed, photograph",
    label: "Vector",
    value: "vector",
  },
  {
    prompt: "a charcoal illustration",
    negativePrompt: "disfigured, ugly, deformed, photograph",
    label: "Charcoal",
    value: "charcoal",
  },
  {
    prompt: "a watercolor painting",
    negativePrompt: "disfigured, ugly, deformed, photograph",
    label: "Watercolor",
    value: "watercolor",
  },
  {
    prompt: "a lego",
    negativePrompt: "disfigured, ugly, deformed",
    label: "Lego",
    value: "lego",
  },
  {
    prompt: "3d render",
    negativePrompt: "disfigured, ugly, deformed",
    label: "3D Render",
    value: "3d-render",
  },
  {
    prompt: "a warcraft character",
    negativePrompt: "disfigured, ugly, deformed",
    label: "Warcraft",
    value: "warcraft",
  },
  {
    prompt: "funko pop figurine",
    negativePrompt: "disfigured, ugly, deformed",
    label: "Funko Pop",
    value: "funko-pop",
  },
  {
    prompt: "wrapped in plastic wrap",
    negativePrompt: "disfigured, ugly, deformed",
    label: "Plastic Wrap",
    value: "plastic",
  },
  { prompt: "pixel art, 16-bit, 8-bit", value: "pixel", label: "Pixel Art" },
  { prompt: "an oil painting", value: "oil", label: "Oil Painting" },
  {
    prompt: "a renaissance oil painting",
    value: "renaissance",
    label: "Renaissance",
  },
  { prompt: "ceramic sculpture statue", value: "ceramic", label: "Ceramics" },
  { prompt: "corroded rusted metal oxidized", value: "rust", label: "Rust" },
  { prompt: "undead zombie", value: "undead", label: "Undead" },
  {
    prompt: "a vampire dracula, with blood red water on fangs",
    value: "vampiric",
    label: "Vampiric",
  },
  { prompt: "neo noir, vaporwave", value: "vaporwave", label: "Vaporwave" },
  { prompt: "made out of fire", value: "fire", label: "Fire" },
  {
    prompt: "made out of water, drops, underwater",
    value: "water",
    label: "Water",
  },
  {
    prompt: "surrounded in flowers, floral portrait, a close-up photograph",
    value: "floral",
    label: "Floral",
  },
];
