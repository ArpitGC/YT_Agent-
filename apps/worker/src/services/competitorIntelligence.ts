import { DateTime } from "luxon";
import { CompetitorVideo } from "./youtubeClient";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "what",
  "when",
  "why",
  "how",
  "you",
  "are",
  "was",
  "were",
  "can",
  "will",
  "about",
  "into",
  "video"
]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function keywordFrequency(lines: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const line of lines) {
    for (const w of words(line)) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return freq;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = [...a].filter((v) => b.has(v)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export type CompetitorWithProxy = CompetitorVideo & {
  viewVelocity: number;
  engagementRate: number;
};

export interface NicheCluster {
  label: string;
  members: CompetitorWithProxy[];
}

export interface CompetitorIntelligence {
  keywordGaps: string[];
  topByVelocity: CompetitorWithProxy[];
  topByEngagement: CompetitorWithProxy[];
  clusters: NicheCluster[];
  summaryLines: string[];
}

export function buildCompetitorIntelligence(input: {
  ownTitle: string;
  ownDescription: string;
  ownTags: string[];
  competitors: CompetitorVideo[];
}): CompetitorIntelligence {
  const enriched: CompetitorWithProxy[] = input.competitors.map((c) => {
    const published = c.publishedAt ? DateTime.fromISO(c.publishedAt) : null;
    const ageDays = Math.max(1, Math.round(DateTime.utc().diff(published ?? DateTime.utc(), "days").days));
    const viewVelocity = c.viewCount / ageDays;
    const engagementRate = c.viewCount > 0 ? (c.likeCount + c.commentCount) / c.viewCount : 0;
    return { ...c, viewVelocity, engagementRate };
  });

  const ownKeywords = new Set(words(`${input.ownTitle} ${input.ownDescription} ${input.ownTags.join(" ")}`));
  const competitorFreq = keywordFrequency(enriched.map((c) => `${c.title} ${c.description}`));

  const keywordGaps = [...competitorFreq.entries()]
    .filter(([w, count]) => !ownKeywords.has(w) && count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w);

  const topByVelocity = [...enriched].sort((a, b) => b.viewVelocity - a.viewVelocity).slice(0, 5);
  const topByEngagement = [...enriched].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 5);

  const clusters: NicheCluster[] = [];
  for (const item of enriched) {
    const itemSet = new Set(words(`${item.title} ${item.description}`));
    let matched = false;

    for (const cluster of clusters) {
      const seed = cluster.members[0];
      const seedSet = new Set(words(`${seed.title} ${seed.description}`));
      if (jaccard(seedSet, itemSet) >= 0.3) {
        cluster.members.push(item);
        matched = true;
        break;
      }
    }

    if (!matched) {
      clusters.push({ label: "", members: [item] });
    }
  }

  for (const cluster of clusters) {
    const labelFreq = keywordFrequency(cluster.members.map((m) => `${m.title} ${m.description}`));
    const label = [...labelFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w).join(" ");
    cluster.label = label || "general";
  }

  const summaryLines = [
    `Keyword gaps: ${keywordGaps.join(", ") || "none"}`,
    ...topByVelocity.map(
      (c) => `Velocity leader: ${c.title} | views/day=${Math.round(c.viewVelocity)} | engagement=${(c.engagementRate * 100).toFixed(2)}%`
    ),
    ...clusters.slice(0, 4).map((cluster) => `Cluster ${cluster.label}: ${cluster.members.length} videos`)
  ];

  return {
    keywordGaps,
    topByVelocity,
    topByEngagement,
    clusters,
    summaryLines
  };
}
