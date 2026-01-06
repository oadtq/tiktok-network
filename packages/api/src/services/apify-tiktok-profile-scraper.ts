interface ApifyRunData {
  id: string;
  defaultDatasetId?: string | null;
}

export interface ApifyTikTokProfileVideoItem {
  id?: string;
  text?: string;
  createTime?: number;
  createTimeISO?: string;
  webVideoUrl?: string;
  authorMeta?: {
    id?: string;
    name?: string;
    nickName?: string;
    fans?: number;
  };
  // Actor output fields vary; keep flexible.
  playCount?: number;
  diggCount?: number;
  commentCount?: number;
  shareCount?: number;
  stats?: {
    playCount?: number;
    diggCount?: number;
    commentCount?: number;
    shareCount?: number;
  };
  videoMeta?: {
    duration?: number;
    coverUrl?: string;
    coverImageUrl?: string;
    coverImage?: string;
  };
  covers?: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asString(v: unknown): string | null {
  if (typeof v === "string" && v.trim() !== "") return v;
  return null;
}

async function apifyRunActor(params: {
  actorId: string;
  token: string;
  input: unknown;
  waitForFinishSeconds?: number;
}): Promise<ApifyRunData> {
  const waitForFinish = params.waitForFinishSeconds ?? 120;
  const url = new URL(`https://api.apify.com/v2/acts/${params.actorId}/runs`);
  url.searchParams.set("token", params.token);
  url.searchParams.set("waitForFinish", String(waitForFinish));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params.input),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Apify actor run failed: ${res.status} ${res.statusText} ${text}`,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Apify actor run failed: invalid JSON response");
  }

  if (!isRecord(json) || !isRecord(json.data)) {
    throw new Error("Apify actor run failed: unexpected response shape");
  }

  const id = asString(json.data.id);
  const defaultDatasetId = asString(json.data.defaultDatasetId);
  if (!id) {
    throw new Error("Apify actor run failed: missing run id");
  }

  return { id, defaultDatasetId };
}

async function apifyGetDatasetItems(params: {
  datasetId: string;
  token: string;
}): Promise<unknown[]> {
  const url = new URL(
    `https://api.apify.com/v2/datasets/${params.datasetId}/items`,
  );
  url.searchParams.set("token", params.token);
  url.searchParams.set("clean", "true");
  url.searchParams.set("format", "json");

  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Apify dataset fetch failed: ${res.status} ${res.statusText} ${text}`,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Apify dataset fetch failed: invalid JSON response");
  }

  if (!Array.isArray(json)) {
    throw new Error("Apify dataset fetch failed: expected array items");
  }
  return json as unknown[];
}

/**
 * Runs Apify's TikTok Profile Scraper actor for a username and returns dataset items.
 *
 * Actor: `clockworks/tiktok-profile-scraper` (ID: `0FXVyOXXEmdGcV88a`)
 * Source: https://apify.com/clockworks/tiktok-profile-scraper
 */
export async function scrapeTikTokProfileVideosViaApify(params: {
  token: string;
  username: string;
  actorId?: string;
  resultsPerPage?: number;
}): Promise<ApifyTikTokProfileVideoItem[]> {
  const actorId = params.actorId ?? "0FXVyOXXEmdGcV88a";
  const resultsPerPage = params.resultsPerPage ?? 100;

  const input = {
    profiles: [params.username],
    profileScrapeSections: ["videos"],
    profileSorting: "latest",
    resultsPerPage,
    excludePinnedPosts: false,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadAvatars: false,
  };

  const run = await apifyRunActor({
    actorId,
    token: params.token,
    input,
    waitForFinishSeconds: 180,
  });

  if (!run.defaultDatasetId) return [];

  const items = await apifyGetDatasetItems({
    datasetId: run.defaultDatasetId,
    token: params.token,
  });

  // Best-effort mapping; keep unknown fields in runtime, but surface known ones.
  return items.map((it) => {
    if (!isRecord(it)) return {};

    const authorMeta = isRecord(it.authorMeta)
      ? {
          id: asString(it.authorMeta.id) ?? undefined,
          name: asString(it.authorMeta.name) ?? undefined,
          nickName: asString(it.authorMeta.nickName) ?? undefined,
          fans: asNumber(it.authorMeta.fans) ?? undefined,
        }
      : undefined;

    const stats = isRecord(it.stats)
      ? {
          playCount: asNumber(it.stats.playCount) ?? undefined,
          diggCount: asNumber(it.stats.diggCount) ?? undefined,
          commentCount: asNumber(it.stats.commentCount) ?? undefined,
          shareCount: asNumber(it.stats.shareCount) ?? undefined,
        }
      : undefined;

    const videoMeta = isRecord(it.videoMeta)
      ? {
          duration: asNumber(it.videoMeta.duration) ?? undefined,
          coverUrl: asString(it.videoMeta.coverUrl) ?? undefined,
          coverImageUrl: asString(it.videoMeta.coverImageUrl) ?? undefined,
          coverImage: asString(it.videoMeta.coverImage) ?? undefined,
        }
      : undefined;

    const covers = Array.isArray(it.covers)
      ? it.covers.map((c) => asString(c)).filter((c): c is string => !!c)
      : undefined;

    return {
      id: asString(it.id) ?? undefined,
      text: asString(it.text) ?? undefined,
      createTime: asNumber(it.createTime) ?? undefined,
      createTimeISO: asString(it.createTimeISO) ?? undefined,
      webVideoUrl: asString(it.webVideoUrl) ?? undefined,
      authorMeta,
      playCount: asNumber(it.playCount) ?? undefined,
      diggCount: asNumber(it.diggCount) ?? undefined,
      commentCount: asNumber(it.commentCount) ?? undefined,
      shareCount: asNumber(it.shareCount) ?? undefined,
      stats,
      videoMeta,
      covers,
    };
  });
}
