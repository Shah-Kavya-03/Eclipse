const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    theme: {
      type: String,
      enum: ["dark", "light", "system"],
      default: "dark",
    },
    preferred_provider_order: {
      type: String,
      default: "gemini,groq,cerebras,nvidia,mistral",
    },
    stream_response: {
      type: Boolean,
      default: true,
    },
    save_history: {
      type: Boolean,
      default: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "settings",
    timestamps: false,
  }
);

module.exports = mongoose.model("Setting", settingSchema);
