import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema(
  {
    ip: String,
    local: String,
    userAgent: String,
    session: String,
    duration: Number,
    width: Number,
    height: Number,
  },
  {
    collection: "Sessions",
    versionKey: false,
    timestamps: { createdAt: true, updatedAt: false },
  },
);

const SessionModel = mongoose.model("SessionModel", SessionSchema);
export default SessionModel;
