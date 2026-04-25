import * as Minio from "minio";
import crypto from "crypto";
import SharpWrapper from "./SharpWrapper.js";
import CONFIG from "../config.js";
import logger from "../logger.js";

let client = null;
let bucketName = null;
let endpointUrl = null;

const MinioWrapper = {
  /**
   * Initialize the MinIO client, ensure bucket exists, and apply public-read policy.
   */
  async init() {
    try {
      const url = new URL(CONFIG.MINIO_ENDPOINT);
      client = new Minio.Client({
        endPoint: url.hostname,
        port: parseInt(url.port, 10) || (url.protocol === "https:" ? 443 : 80),
        useSSL: url.protocol === "https:",
        accessKey: CONFIG.MINIO_ACCESS_KEY,
        secretKey: CONFIG.MINIO_SECRET_KEY,
      });
      bucketName = CONFIG.MINIO_BUCKET;
      endpointUrl = CONFIG.MINIO_ENDPOINT.replace(/\/+$/, "");

      // Ensure bucket exists
      const exists = await client.bucketExists(bucketName);
      if (!exists) {
        await client.makeBucket(bucketName);
        logger.info(`MinIO bucket "${bucketName}" created`);
      }

      // Public read-only policy so images are browser-accessible via direct URL
      const publicPolicy = JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      });
      await client.setBucketPolicy(bucketName, publicPolicy);

      logger.success(`MinIO connected: ${endpointUrl} (bucket: ${bucketName})`);
    } catch (error) {
      logger.error(`MinIO connection failed: ${error.message}`);
      client = null;
      bucketName = null;
      endpointUrl = null;
    }
  },

  /**
   * Build a direct public URL for an object key.
   */
  getPublicUrl(key) {
    if (!endpointUrl || !bucketName) return "";
    return `${endpointUrl}/${bucketName}/${key}`;
  },

  /**
   * Upload a base64 image → full-size PNG + thumbnail JPEG.
   * Returns { id, image, thumbnail }.
   */
  async uploadImage(base64) {
    const id = crypto.randomUUID().slice(0, 11);
    const base64Data = Buffer.from(base64, "base64");

    // Upload full-size PNG
    let image = "";
    try {
      const key = `${id}.png`;
      await client.putObject(bucketName, key, base64Data, base64Data.length, {
        "Content-Type": "image/png",
      });
      image = MinioWrapper.getPublicUrl(key);
    } catch (error) {
      logger.error(`MinIO upload (full): ${error.message}`);
    }

    // Upload thumbnail JPEG
    let thumbnail = "";
    try {
      const key = `thumbnails/${id}.jpeg`;
      const thumbnailBuffer = await SharpWrapper.resizeAndCompress(base64Data);
      await client.putObject(
        bucketName,
        key,
        thumbnailBuffer,
        thumbnailBuffer.length,
        { "Content-Type": "image/jpeg" },
      );
      thumbnail = MinioWrapper.getPublicUrl(key);
    } catch (error) {
      logger.error(`MinIO upload (thumb): ${error.message}`);
    }

    return { id, image, thumbnail };
  },

  /**
   * Upload only a thumbnail for an existing image.
   * Returns { thumbnail }.
   */
  async uploadImageThumbnail(base64, imageName) {
    const base64Data = Buffer.from(base64, "base64");
    const processedImage = await SharpWrapper.resizeAndCompress(base64Data);

    let thumbnail = "";
    try {
      const key = `thumbnails/${imageName}.jpg`;
      await client.putObject(
        bucketName,
        key,
        processedImage,
        processedImage.length,
        { "Content-Type": "image/jpg" },
      );
      thumbnail = MinioWrapper.getPublicUrl(key);
    } catch (error) {
      logger.error(`MinIO upload (thumb): ${error.message}`);
    }

    return { thumbnail };
  },
};

export default MinioWrapper;
