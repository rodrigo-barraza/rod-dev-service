/**
 * Generic controller for renderIds Map-based collections (Likes & Favorites).
 * Both LikeModel and FavoriteModel share the identical schema:
 *   { local, session, ip, renderIds: Map<String, Boolean> }
 *
 * @param {import('mongoose').Model} Model
 * @param {string} entityName - Human-readable name for error messages
 */
const createRenderIdMapController = (Model, entityName) => ({
  insert: async (renderId, headers) => {
    const query = { ip: headers.ip };
    const update = {};
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    const doc = await Model.findOneAndUpdate(query, update, options);
    doc.local = headers.local;
    doc.session = headers.session;
    doc.ip = headers.ip;
    doc.renderIds.set(renderId, true);
    return doc.save();
  },

  getByIp: async (ip) => {
    const doc = await Model.findOne({ ip });
    if (!doc) {
      throw new Error(`${entityName} not found`);
    }
    return doc;
  },

  remove: async (renderId, ip) => {
    const doc = await Model.findOne({ ip });
    if (!doc) {
      throw new Error(`${entityName} not found`);
    }
    doc.renderIds.set(renderId, false);
    return doc.save();
  },

  countActive: async (ip) => {
    const doc = await Model.findOne({ ip });
    if (!doc || !doc.renderIds.size) {
      return 0;
    }
    let count = 0;
    for (const [, value] of doc.renderIds.entries()) {
      if (value) count++;
    }
    return count;
  },
});

export default createRenderIdMapController;

// ─── Pre-built singletons ──────────────────────────────────────────
import LikeModel from "../models/LikeModel.js";
import FavoriteModel from "../models/FavoriteModel.js";

export const LikeController = createRenderIdMapController(LikeModel, "Like");
export const FavoriteController = createRenderIdMapController(
  FavoriteModel,
  "Favorite",
);
