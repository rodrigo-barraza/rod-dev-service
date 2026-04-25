import mongoose from "mongoose";
import crypto from "crypto";

const RenderSchema = new mongoose.Schema(
  {
    local: String,
    session: String,
    image: String,
    thumbnail: String,
    prompt: String,
    negativePrompt: String,
    sampler: String,
    cfg: Number,
    style: String,
    aspectRatio: String,
    count: Number,
    id: {
      type: String,
      default: () => crypto.randomUUID().slice(0, 11),
    },
    ip: String,
    deleted: Boolean,
  },
  {
    collection: "Renders",
    versionKey: false,
    timestamps: { createdAt: true, updatedAt: false },
  },
);

RenderSchema.statics.random = async function () {
  const count = await this.countDocuments();
  const rand = Math.floor(Math.random() * count);
  return this.findOne().skip(rand);
};

const RenderModel = mongoose.model("RenderModel", RenderSchema);
export default RenderModel;
