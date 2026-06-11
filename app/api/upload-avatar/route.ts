import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  
});




export const runtime = "nodejs"; // importante (cloudinary no corre en edge)
export const dynamic = "force-dynamic";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Falta archivo" }, { status: 400 });
    }

    if (!allowedImageTypes.has(file.type)) {
      return NextResponse.json({ error: "Tipo de imagen invalido" }, { status: 400 });
    }

    // opcional: validar tamaño (1MB)
    if (file.size > 1_000_000) {
      return NextResponse.json({ error: "Máximo 1MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!hasAllowedImageSignature(buffer)) {
      return NextResponse.json({ error: "Archivo de imagen invalido" }, { status: 400 });
    }

    const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "Afilink/avatars",
          resource_type: "image",
        },
        (err, result) => {
          if (err || !result) reject(err);
          else resolve(result);
        }
      );

      stream.end(buffer);
    });

    return NextResponse.json({ ok: true, url: uploaded.secure_url });
  } catch {
    return NextResponse.json({ error: "Error subiendo imagen" }, { status: 500 });
  }
}
