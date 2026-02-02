import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs/promises';

class OCRService {
  async preprocessImage(inputPath: string): Promise<Buffer> {
    return await sharp(inputPath)
      .greyscale()
      .normalize()
      .sharpen()
      .toBuffer();
  }

  async extractText(imagePath: string): Promise<string> {
    try {
      // Preprocess image
      const processedBuffer = await this.preprocessImage(imagePath);
      
      // Write processed image temporarily
      const processedPath = `${imagePath}.processed.png`;
      await fs.writeFile(processedPath, processedBuffer);

      // Run OCR
      const { data } = await Tesseract.recognize(processedPath, 'eng', {
        logger: info => console.log(info)
      });

      // Cleanup
      await fs.unlink(processedPath).catch(() => {});
      await fs.unlink(imagePath).catch(() => {});

      return data.text.trim();
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('OCR processing failed');
    }
  }
}

export const ocrService = new OCRService();