const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    passwordHash: String,
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    currentBalance: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
)

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema)
