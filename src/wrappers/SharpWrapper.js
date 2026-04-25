import sharp from "sharp";

const SharpWrapper = {
  resizeAndCompress: async (inputBuffer) => {
    const { width, height } = await sharp(inputBuffer).metadata();
    const newImageBuffer = await sharp(inputBuffer)
      .resize(Math.round(width / 2), Math.round(height / 2))
      .jpeg({ quality: 60, mozjpeg: true })
      .toBuffer();
    return newImageBuffer;
  },
};

export default SharpWrapper;
