export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFirstRenderableProductImage } from "@/lib/product-images";
import { getPurchaseSession } from "@/lib/purchase-analytics";

type Props = {
  params: Promise<{
    code: string;
  }>;
};

function getBaseUrl(req: NextRequest) {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isSocialBot(userAgent: string | null) {
  if (!userAgent) return false;

  return /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|pinterest|googlebot|bingbot/i.test(
    userAgent
  );
}

function absoluteUrl(baseUrl: string, url: string | null) {
  if (!url) return `${baseUrl}/img/logosbg.png`;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

function buildAffiliatePreviewHtml({
  title,
  description,
  imageUrl,
  pageUrl,
  redirectUrl,
  shouldRedirect,
}: {
  title: string;
  description: string;
  imageUrl: string;
  pageUrl: string;
  redirectUrl: string;
  shouldRedirect: boolean;
}) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImageUrl = escapeHtml(imageUrl);
  const safePageUrl = escapeHtml(pageUrl);
  const safeRedirectUrl = escapeHtml(redirectUrl);
  const redirectScript = shouldRedirect
    ? `<meta http-equiv="refresh" content="0;url=${safeRedirectUrl}" />
    <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>`
    : "";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <link rel="canonical" href="${safePageUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Afilink" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:image" content="${safeImageUrl}" />
    <meta property="og:url" content="${safePageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImageUrl}" />
    ${redirectScript}
  </head>
  <body style="margin:0;font-family:Arial,sans-serif;background:#fff7ed;color:#111827;">
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;">
      <section style="max-width:520px;border:1px solid #fed7aa;border-radius:18px;background:#fff;padding:24px;box-shadow:0 20px 50px rgba(15,23,42,.12);">
        <img src="${safeImageUrl}" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:14px;background:#f1f5f9;" />
        <h1 style="margin:20px 0 8px;font-size:28px;line-height:1.15;">${safeTitle}</h1>
        <p style="margin:0 0 20px;color:#475569;line-height:1.6;">${safeDescription}</p>
        <a href="${safeRedirectUrl}" style="display:inline-flex;align-items:center;justify-content:center;border-radius:10px;background:#F78211;color:white;padding:12px 16px;text-decoration:none;font-weight:700;">
          Ver producto
        </a>
      </section>
    </main>
  </body>
</html>`;
}

function htmlResponse(html: string) {
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}

export async function GET(req: NextRequest, context: Props) {
  try {
    const { code } = await context.params;
    const ua = req.headers.get("user-agent");
    const botRequest = isSocialBot(ua);
    const baseUrl = getBaseUrl(req);

    const link = await prisma.affiliateLink.findUnique({
      where: { code },
      select: {
        id: true,
        productId: true,
        product: {
          select: {
            name: true,
            desc: true,
            imageUrls: true,
            price: true,
            seller: {
              select: {
                name: true,
                storeSlug: true,
              },
            },
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404 });
    }

    const url = new URL(req.url);
    url.pathname = `/products/${link.productId}`;
    url.searchParams.set("ref", code);

    const pageUrl = `${baseUrl}/l/${encodeURIComponent(code)}`;
    const redirectUrl = url.toString();
    const sellerName =
      link.product.seller.name ?? link.product.seller.storeSlug ?? "Afilink";
    const description =
      escapeText(link.product.desc ?? "") ||
      `Producto recomendado por ${sellerName} en Afilink.`;
    const html = buildAffiliatePreviewHtml({
      title: link.product.name,
      description,
      imageUrl: absoluteUrl(
        baseUrl,
        getFirstRenderableProductImage(link.product.imageUrls)
      ),
      pageUrl,
      redirectUrl,
      shouldRedirect: !botRequest,
    });

    if (botRequest) {
      return htmlResponse(html);
    }

    const xff = req.headers.get("x-forwarded-for");
    const ip = xff ? xff.split(",")[0].trim() : null;

    const click = await prisma.click.create({
      data: {
        linkId: link.id,
        ip,
        userAgent: ua ?? null,
        sessionId: await getPurchaseSession(),
      },
      select: { id: true },
    });

    const res = htmlResponse(html);
    const maxAge = 60 * 60 * 24 * 30;

    res.cookies.set({
      name: "aff_click_id",
      value: click.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    res.cookies.set({
      name: "aff_code",
      value: code,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    // limpiar cookies de campaña
    res.cookies.set({
      name: "aff_campaign_click_id",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    res.cookies.set({
      name: "aff_campaign_code",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (e) {
    console.error("Error en l/[code]:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
