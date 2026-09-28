const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password_hashed: {
      type: String,
      required: [true, "Password hash is required"],
    },
    is_admin: {
      type: Boolean,
      default: false,
    },
    is_flagged: {
      type: Boolean,
      default: false,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "users",
    timestamps: false,
  }
);

// Remove sensitive hash from JSON serialization
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password_hashed;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
