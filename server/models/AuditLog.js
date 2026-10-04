const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    session_id: {
      type: String,
      required: true,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: null,
    },
    prompt_masked: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      default: null,
    },
    model_used: {
      type: String,
      default: null,
    },
    api_used: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      required: true,
      // Safe | PII Detected | Prompt Injection | Harmful | Jailbreak | Rate Limited
    },
    threat_tier: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    lime_explanation: {
      type: String,
      default: null,
    },
    entities_detected: {
      type: Array,
      default: [],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: -1,
    },
  },
  {
    collection: "audit_logs",
    timestamps: false,
  }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
