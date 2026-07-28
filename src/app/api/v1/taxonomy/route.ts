import { apiOk, apiPreflight, apiInternal } from "@/lib/api/response";
import { AUDIENCES, GOALS } from "@/lib/taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/**
 * Имена иконок lucide-react по slug (taxonomy.ts редактировать нельзя,
 * поэтому держим карту slug → имя иконки здесь — как строки для клиента).
 */
const AUDIENCE_ICON: Record<string, string> = {
  men: "Mars",
  women: "Venus",
  kids: "Baby",
};

const GOAL_ICON: Record<string, string> = {
  immunity: "ShieldPlus",
  "weight-loss": "Flame",
  sport: "Dumbbell",
  energy: "Zap",
  beauty: "Sparkles",
  joints: "Bone",
  calm: "Moon",
  digestion: "Soup",
  heart: "HeartPulse",
};

/** GET /api/v1/taxonomy — аудитории и цели (иконка строкой, без keywords). */
export async function GET() {
  try {
    return apiOk({
      audiences: AUDIENCES.map((a) => ({
        slug: a.slug,
        name: a.name,
        icon: a.icon.displayName || a.icon.name || AUDIENCE_ICON[a.slug] || null,
      })),
      goals: GOALS.map((g) => ({
        slug: g.slug,
        name: g.name,
        icon: g.icon.displayName || g.icon.name || GOAL_ICON[g.slug] || null,
      })),
    });
  } catch (e) {
    return apiInternal("api/v1/taxonomy", e);
  }
}
