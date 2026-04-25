import RenderModel from "../models/RenderModel.js";
import FavoriteModel from "../models/FavoriteModel.js";
import LikeModel from "../models/LikeModel.js";
import {
  buildRenderIdLookup,
  buildEngagementFields,
} from "../utils/utilities.js";

const NOT_DELETED = { deleted: { $ne: true } };

const RenderController = {
  createRenderObject: (renderData) => ({
    id: renderData.id,
    thumbnail: renderData.thumbnail,
    image: renderData.image,
    style: renderData.style,
    cfg: renderData.cfg,
    prompt: renderData.prompt,
    sampler: renderData.sampler,
    createdAt: renderData.createdAt,
    aspectRatio: renderData.aspectRatio,
    like: renderData.like,
    likes: renderData.likes,
    favorite: renderData.favorite,
    favorites: renderData.favorites,
  }),

  insertRender: async (
    id,
    image,
    thumbnail,
    count,
    prompt,
    negativePrompt,
    sampler,
    cfg,
    style,
    aspectRatio,
    headers,
  ) => {
    const Render = new RenderModel();
    Render.ip = headers.ip;
    Render.local = headers.local;
    Render.userAgent = headers.userAgent;
    Render.session = headers.session;
    Render.id = id;
    Render.image = image;
    Render.thumbnail = thumbnail;
    Render.prompt = prompt;
    Render.negativePrompt = negativePrompt;
    Render.sampler = sampler;
    Render.cfg = cfg;
    Render.style = style;
    Render.count = count;
    Render.aspectRatio = aspectRatio;
    return Render.save();
  },

  countRenders: async () => {
    return RenderModel.countDocuments({});
  },

  getLatestRenders: async (limit = 1) => {
    const results = await RenderModel.find({}).sort({ _id: -1 }).limit(limit);
    return results.length ? results : null;
  },

  getRender: async (id) => {
    const results = await RenderModel.find({ id });
    return results.length ? results : null;
  },

  getRenderByCountId: async (countField) => {
    return RenderModel.findOne({ count: Number(countField) });
  },

  getRenderById: async (id, ip) => {
    const response = await RenderModel.aggregate([
      { $match: { id } },
      buildRenderIdLookup(LikeModel, "like"),
      buildRenderIdLookup(FavoriteModel, "favorite"),
      ...buildEngagementFields(ip),
    ]).exec();

    return response?.length ? response[0] : null;
  },

  getRandomWithLikes: async (ip) => {
    const randomRender = await RenderModel.random();
    if (!randomRender) return null;

    const response = await RenderModel.aggregate([
      { $match: { id: randomRender.id } },
      buildRenderIdLookup(LikeModel, "like"),
      buildRenderIdLookup(FavoriteModel, "favorite"),
      ...buildEngagementFields(ip),
    ]).exec();

    return response?.length ? response[0] : null;
  },

  getRandom: async () => {
    return RenderModel.random();
  },

  updateRenders: async () => {
    const renders = await RenderModel.find({});
    renders.forEach((render) => {
      render.deleted = false;
      render.save();
    });
    return renders;
  },

  getRendersByIP: async (ip) => {
    return RenderModel.find({ ip, ...NOT_DELETED }).sort({ _id: -1 });
  },

  getFavoriteRenders: async (ip) => {
    return RenderModel.aggregate([
      { $match: { ip, ...NOT_DELETED } },
      buildRenderIdLookup(FavoriteModel, "favorite", { includeIp: false }),
      { $unwind: "$favorite" },
    ]).exec();
  },

  getRandomRenders: async (limit = 1) => {
    return RenderModel.aggregate([
      { $match: NOT_DELETED },
      { $sample: { size: Number(limit) } },
    ]);
  },

  getRenders: async (ip) => {
    const response = await RenderModel.aggregate([
      { $match: { ip, ...NOT_DELETED } },
      buildRenderIdLookup(FavoriteModel, "favorite"),
      buildRenderIdLookup(LikeModel, "like"),
      ...buildEngagementFields(ip, { extraSet: { isCreator: true } }),
    ])
      .sort({ _id: -1 })
      .exec();

    return response?.length ? response : null;
  },

  deleteRender: async (id, ip) => {
    const result = await RenderModel.findOneAndUpdate(
      { ip, id },
      { deleted: true },
    );
    if (!result) {
      throw new Error("Render not found");
    }
    return result;
  },

  getLikedRenders: async (ip) => {
    const response = await RenderModel.aggregate([
      { $match: NOT_DELETED },
      buildRenderIdLookup(FavoriteModel, "favorite", { includeIp: false }),
      buildRenderIdLookup(LikeModel, "like", { extraMatch: { ip } }),
      ...buildEngagementFields(ip, {
        extraSet: {
          isCreator: {
            $cond: {
              if: { $eq: ["$ip", ip] },
              then: true,
              else: false,
            },
          },
        },
      }),
      { $match: { like: { $ne: [] } } },
    ])
      .sort({ _id: -1 })
      .exec();

    return response?.length ? response : [];
  },
};

export default RenderController;
