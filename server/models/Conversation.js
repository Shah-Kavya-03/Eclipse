const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "assistant", "ai"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    session_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    messages: [messageSchema],
    status: {
      type: String,
      enum: ["Protected", "Modified", "Blocked"],
      default: "Protected",
    },
    model_used: {
      type: String,
      default: null,
    },
    api_used: {
      type: String,
      default: null,
    },
    custom_title: {
      type: String,
      default: null,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: -1,
    },
  },
  {
    collection: "conversations",
    timestamps: false,
  }
);

// Virtual for auto-derived preview title (first user message)
conversationSchema.virtual("derived_title").get(function () {
  if (this.custom_title) return this.custom_title;
  if (this.messages && this.messages.length > 0) {
    const firstUserMsg = this.messages.find((m) => m.sender === "user");
    if (firstUserMsg && firstUserMsg.text) {
      const text = firstUserMsg.text.trim();
      return text.length > 50 ? text.slice(0, 50) + "..." : text;
    }
  }
  return "New Chat";
});

conversationSchema.set("toJSON", { virtuals: true });
conversationSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Conversation", conversationSchema);
