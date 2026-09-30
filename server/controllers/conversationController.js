const Conversation = require("../models/Conversation");

/**
 * Format conversation document for API response.
 */
const serializeConversation = (doc, includeMessages = false) => {
  const result = {
    session_id: doc.session_id,
    user_id: doc.user_id,
    status: doc.status || "Protected",
    model_used: doc.model_used,
    api_used: doc.api_used,
    created_at: doc.created_at ? doc.created_at.toISOString() : null,
    message_count: doc.messages ? doc.messages.length : 0,
    title: doc.custom_title || doc.derived_title || "New Chat",
  };

  if (includeMessages && doc.messages) {
    result.messages = doc.messages.map((m) => ({
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp ? m.timestamp.toISOString() : null,
    }));
  }

  return result;
};

/**
 * @route   GET /api/conversations?user_id=... (or /conversations?user_id=...)
 * @desc    Get all conversations for a specific user (newest first)
 * @access  Public (Guest/Logged-in)
 */
const listConversations = async (req, res) => {
  try {
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        detail: "Query parameter `user_id` is required.",
      });
    }

    const docs = await Conversation.find({ user_id: userId })
      .sort({ created_at: -1 })
      .lean({ virtuals: true });

    const conversations = docs.map((doc) => {
      let title = doc.custom_title;
      if (!title && doc.messages && doc.messages.length > 0) {
        const firstUser = doc.messages.find((m) => m.sender === "user");
        if (firstUser && firstUser.text) {
          const t = firstUser.text.trim();
          title = t.length > 50 ? t.slice(0, 50) + "..." : t;
        }
      }
      return {
        session_id: doc.session_id,
        user_id: doc.user_id,
        status: doc.status || "Protected",
        model_used: doc.model_used,
        api_used: doc.api_used,
        created_at: doc.created_at ? new Date(doc.created_at).toISOString() : null,
        message_count: doc.messages ? doc.messages.length : 0,
        title: title || "New Chat",
      };
    });

    return res.json({
      conversations,
      count: conversations.length,
    });
  } catch (error) {
    console.error("[Conversation List Error]:", error);
    return res.status(500).json({
      success: false,
      detail: "Failed to retrieve conversations.",
    });
  }
};

/**
 * @route   GET /api/conversations/:session_id
 * @desc    Get complete message history for one session
 * @access  Public
 */
const getConversation = async (req, res) => {
  try {
    const { session_id } = req.params;

    const doc = await Conversation.findOne({ session_id });
    if (!doc) {
      return res.status(404).json({
        success: false,
        detail: "Conversation not found.",
      });
    }

    return res.json(serializeConversation(doc, true));
  } catch (error) {
    console.error("[Conversation Get Error]:", error);
    return res.status(500).json({
      success: false,
      detail: "Failed to fetch conversation.",
    });
  }
};

/**
 * @route   PATCH /api/conversations/:session_id/title
 * @desc    Rename conversation title (persists GUI's Rename Chat)
 * @access  Public
 */
const renameConversation = async (req, res) => {
  try {
    const { session_id } = req.params;
    const { title } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        detail: "A non-empty string `title` is required.",
      });
    }

    const trimmedTitle = title.trim();

    const doc = await Conversation.findOneAndUpdate(
      { session_id },
      { $set: { custom_title: trimmedTitle } },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        detail: "Conversation not found.",
      });
    }

    return res.json({
      session_id,
      title: trimmedTitle,
    });
  } catch (error) {
    console.error("[Conversation Rename Error]:", error);
    return res.status(500).json({
      success: false,
      detail: "Failed to rename conversation.",
    });
  }
};

/**
 * @route   DELETE /api/conversations/:session_id
 * @desc    Delete single conversation session
 * @access  Public
 */
const deleteConversation = async (req, res) => {
  try {
    const { session_id } = req.params;

    const result = await Conversation.deleteOne({ session_id });
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        detail: "Conversation not found.",
      });
    }

    return res.json({
      message: "Conversation deleted.",
      session_id,
    });
  } catch (error) {
    console.error("[Conversation Delete Error]:", error);
    return res.status(500).json({
      success: false,
      detail: "Failed to delete conversation.",
    });
  }
};

module.exports = {
  listConversations,
  getConversation,
  renameConversation,
  deleteConversation,
};
