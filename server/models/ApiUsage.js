const mongoose = require("mongoose");

const apiUsageSchema = new mongoose.Schema(
  {
    api_name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    requests_count: {
      type: Number,
      default: 0,
    },
    tokens_used: {
      type: Number,
      default: 0,
    },
    last_used: {
      type: Date,
      default: null,
    },
    is_rate_limited: {
      type: Boolean,
      default: false,
    },
    rate_limit_reset_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "api_usage",
    timestamps: false,
  }
);

module.exports = mongoose.model("ApiUsage", apiUsageSchema);
