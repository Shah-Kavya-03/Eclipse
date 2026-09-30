const Setting = require("../models/Setting");
const Conversation = require("../models/Conversation");

/**
 * @route   GET /api/settings?user_id=... (or /settings?user_id=...)
 * @desc    Get user settings or return defaults
 * @access  Public
 */
const getSettings = async (req, res) => {
  try {
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        detail: "Query parameter `user_id` is required.",
      });
    }

    let settings = await Setting.findOne({ user_id: userId });

    if (!settings) {
      settings = {
        user_id: userId,
        theme: "dark",
        preferred_provider_order: "gemini,groq,cerebras,nvidia,mistral",
        stream_response: true,
        save_history: true,
      };
    }

    return res.json({
      user_id: settings.user_id,
      theme: settings.theme || "dark",
      preferred_provider_order:
        settings.preferred_provider_order ||
        "gemini,groq,cerebras,nvidia,mistral",
      stream_response: settings.stream_response !== false,
      save_history: settings.save_history !== false,
    });
  } catch (error) {
    console.error("[Settings Get Error]:", error);
    return res.status(500).json({
      success: false,
      detail: "Failed to fetch user settings.",
    });
  }
};

/**
 * @route   PUT /api/settings (or /settings)
 * @desc    Update user settings
 * @access  Public
 */
const updateSettings = async (req, res) => {
  try {
    const {
      user_id,
      theme,
      preferred_provider_order,
      stream_response,
      save_history,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        detail: "`user_id` is required in the request body.",
      });
    }

    const updateData = {
      theme: theme || "dark",
      preferred_provider_order:
        preferred_provider_order || "gemini,groq,cerebras,nvidia,mistral",
      stream_response: stream_response !== false,
      save_history: save_history !== false,
      updated_at: new Date(),
    };

    await Setting.findOneAndUpdate(
      { user_id },
      { $set: updateData, $setOnInsert: { user_id } },
      { upsert: true, new: true }
    );

    return res.json({
      message: "Settings updated successfully.",
      settings: updateData,
    });
  } catch (error) {
    console.error("[Settings Update Error]:", error);
    return res.status(500).json({
      success: false,
      detail: "Failed to update settings.",
    });
  }
};

/**
 * @route   POST /api/settings/clear-history (or /settings/clear-history)
 * @desc    Bulk clear all conversations for a user (DPDP Act 2023 compliant)
 * @access  Public
 */
const clearHistory = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        detail: "`user_id` is required in the request body.",
      });
    }

    const result = await Conversation.deleteMany({ user_id });

    return res.json({
      message: `Successfully deleted ${result.deletedCount} conversations.`,
      deleted_count: result.deletedCount,
      user_id,
    });
  } catch (error) {
    console.error("[Settings Clear History Error]:", error);
    return res.status(500).json({
      success: false,
      detail: "Failed to clear conversation history.",
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  clearHistory,
};
