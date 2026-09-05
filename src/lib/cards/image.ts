export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

async function bitmapFromFile(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; close: () => void }> {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      close: () => bitmap.close(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      return {
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        close: () => undefined,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export async function fileToDataUrl(
  file: File,
  maxEdge: number,
  preferPng: boolean,
): Promise<string> {
  const maxBytes = 12 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error("Image is too large (12 MB maximum)");
  if (!file.type.startsWith("image/") && !file.name.match(/\.(png|jpe?g|gif|webp|svg)$/i)) {
    throw new Error("Not an image");
  }
  const src = await bitmapFromFile(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(src.width, src.height, 1));
    const w = Math.max(1, Math.round(src.width * scale));
    const h = Math.max(1, Math.round(src.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas");
    src.draw(ctx, w, h);
    const png = preferPng || file.type.includes("png") || file.type.includes("svg");
    return png ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    src.close();
  }
}
