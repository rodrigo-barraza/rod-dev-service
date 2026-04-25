import mongoose from "mongoose";
import crypto from "crypto";

const JournalSchema = new mongoose.Schema(
  {
    ip: String,
    local: String,
    session: String,
    id: {
      type: String,
      default: () => crypto.randomUUID().slice(0, 11),
    },
    date: {
      type: Date,
      default: Date.now,
    },
    exercise: String,
    reps: Number,
    weight: Number,
    unit: String,
    style: String,
    stance: String,
    equipment: String,
    position: String,
  },
  {
    collection: "Journal",
    versionKey: false,
    timestamps: { createdAt: true, updatedAt: false },
  },
);

const JournalModel = mongoose.model("JournalModel", JournalSchema);
export default JournalModel;
