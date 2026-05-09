import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  
});




export const runtime = "nodejs"; // importante (cloudinary no corre en edge)
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Falta archivo" }, { status: 400 });
    }

    // opcional: validar tamaño (1MB)
    if (file.size > 1_000_000) {
      return NextResponse.json({ error: "Máximo 1MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploaded = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "Afilink/avatars",
          resource_type: "image",
        },
        (err, result) => {
          if (err || !result) reject(err);
          else resolve(result as any);
        }
      );

      stream.end(buffer);
    });

    return NextResponse.json({ ok: true, url: uploaded.secure_url });
  } catch (e) {
    return NextResponse.json({ error: "Error subiendo imagen" }, { status: 500 });
  }
}
