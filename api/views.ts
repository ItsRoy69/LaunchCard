import { Redis } from "@upstash/redis";

const KEY = "launchcard:pageviews";

type VercelRequest = {
  method?: string;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  end: () => void;
};

function redisFromEnv(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_KV_REST_API_URL ||
    process.env.STORAGE_URL ||
    process.env.REDIS_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_KV_REST_API_TOKEN ||
    process.env.STORAGE_TOKEN ||
    process.env.REDIS_TOKEN;

  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const redis = redisFromEnv();
  if (!redis) {
    res.status(503).json({
      error: "Redis not configured",
      total: null,
    });
    return;
  }

  try {
    if (req.method === "POST") {
      const total = await redis.incr(KEY);
      res.status(200).json({ total });
      return;
    }

    if (req.method === "GET") {
      const value = await redis.get<number | string | null>(KEY);
      const total = value == null ? 0 : Number(value) || 0;
      res.status(200).json({ total });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[views]", err);
    res.status(500).json({ error: "Counter failed", total: null });
  }
}
