import mongoose from "mongoose";

/**
 * Schema factory for renderIds Map-based collections (Likes & Favorites).
 * Both share an identical schema — only the collection name differs.
 *
 * @param {string} modelName - Mongoose model registration name
 * @param {string} collectionName - MongoDB collection name
 */
const RenderIdMapSchema = new mongoose.Schema(
  {
    local: String,
    session: String,
    ip: String,
    renderIds: {
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  {
    versionKey: false,
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export default function createRenderIdMapModel(modelName, collectionName) {
  return mongoose.model(modelName, RenderIdMapSchema.clone(), collectionName);
}
