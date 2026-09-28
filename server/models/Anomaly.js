const mongoose = require("mongoose");

const anomalySchema = new mongoose.Schema(
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
    reason: {
      type: String,
      required: true,
    },
    flagged_at: {
      type: Date,
      default: Date.now,
      index: -1,
    },
  },
  {
    collection: "anomalies",
    timestamps: false,
  }
);

module.exports = mongoose.model("Anomaly", anomalySchema);
