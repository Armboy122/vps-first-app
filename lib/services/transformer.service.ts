import prisma from "@/lib/prisma";
import { Transformer } from "@prisma/client";

/**
 * Service สำหรับจัดการ Transformer database operations
 */
export class TransformerService {
  /**
   * ค้นหา Transformer ตามคำค้นหา
   */
  static async searchTransformers(searchTerm: string, limit: number = 10): Promise<Transformer[]> {
    if (!searchTerm.trim()) {
      return [];
    }

    return await prisma.transformer.findMany({
      where: {
        OR: [
          { transformerNumber: { contains: searchTerm, mode: "insensitive" } },
          { gisDetails: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      take: limit,
      orderBy: {
        transformerNumber: 'asc'
      }
    });
  }

  /**
   * ดึง Transformer ตาม transformerNumber
   */
  static async getByTransformerNumber(transformerNumber: string): Promise<Transformer | null> {
    return await prisma.transformer.findUnique({
      where: { transformerNumber }
    });
  }

  /**
   * สร้าง Transformer ใหม่ (ถ้าจำเป็น)
   */
  static async createTransformer(data: {
    transformerNumber: string;
    gisDetails: string;
  }): Promise<Transformer> {
    return await prisma.transformer.create({
      data
    });
  }

  /**
   * อัปเดต Transformer
   */
  static async updateTransformer(
    transformerNumber: string, 
    data: Partial<Pick<Transformer, 'gisDetails'>>
  ): Promise<Transformer> {
    return await prisma.transformer.update({
      where: { transformerNumber },
      data
    });
  }

  /**
   * ตรวจสอบว่า Transformer มีอยู่หรือไม่
   */
  static async exists(transformerNumber: string): Promise<boolean> {
    const count = await prisma.transformer.count({
      where: { transformerNumber }
    });
    return count > 0;
  }
}