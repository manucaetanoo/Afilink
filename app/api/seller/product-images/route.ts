import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { requireRole, requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE = 3_000_000;

const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

if (
  cloudinaryConfig.cloud_name &&
  cloudinaryConfig.api_key &&
  cloudinaryConfig.api_secret
) {
  cloudinary.config(cloudinaryConfig);
}

function hasAllowedImageSignature(buffer: Buffer) {
  const isJpeg =
    buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const isWebp =
    buffer.length > 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";

  return isJpeg || isPng || isWebp;
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Falta archivo" }, { status: 400 });
    }

    if (!allowedImageTypes.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Tipo de imagen invalido" },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "La imagen debe pesar maximo 3MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!hasAllowedImageSignature(buffer)) {
      return NextResponse.json(
        { ok: false, error: "Archivo de imagen invalido" },
        { status: 400 }
      );
    }

    const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `Afilink/products/${user.id}`,
          resource_type: "image",
          transformation: [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (err, result) => {
          if (err || !result) reject(err);
          else resolve(result);
        }
      );

      stream.end(buffer);
    });

    return NextResponse.json({ ok: true, url: uploaded.secure_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error subiendo imagen";
    const status =
      message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
