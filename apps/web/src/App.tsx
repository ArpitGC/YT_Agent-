import { useEffect, useMemo, useState } from "react";

type Channel = {
  id: string;
  title?: string;
  youtubeChannelId: string;
  approvalMode: "AUTO" | "REVIEW";
  timezone: string;
  scheduleHourLocal: number;
  scheduleMinuteLocal: number;
  maxRunsPerDay: number;
  maxRunsPerMonth: number;
};

type Job = {
  id: string;
  status: string;
  targetVideoId?: string;
  generatedTitle?: string;
  generatedDescription?: string;
  generatedTags?: string[];
  generatedThumbnailUrl?: string;
};

const apiBase = "http://localhost:4000";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "demo-user",
      "x-user-email": "demo@example.com",
      ...(init?.headers ?? {})
    }
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

export function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [jobId, setJobId] = useState<string>("");
  const [job, setJob] = useState<Job | null>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [usage, setUsage] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [videoId, setVideoId] = useState("");
  const selectedChannel = useMemo(() => channels.find((c) => c.id === selectedChannelId), [channels, selectedChannelId]);

  async function refresh(): Promise<void> {
    const loadedChannels = await api<Channel[]>("/channels");
    setChannels(loadedChannels);
    if (!selectedChannelId && loadedChannels[0]) {
      setSelectedChannelId(loadedChannels[0].id);
    }

    const [auditRows, usageRows] = await Promise.all([api<any[]>("/audit"), api<any[]>("/usage")]);
    setAudit(auditRows);
    setUsage(usageRows);
  }

  useEffect(() => {
    refresh().catch(console.error);
  }, []);

  async function connectYouTube(): Promise<void> {
    const data = await api<{ authUrl: string }>("/auth/youtube/connect/start");
    window.location.href = data.authUrl;
  }

  async function createJob(): Promise<void> {
    if (!selectedChannelId) {
      return;
    }

    const result = await api<{ jobId: string }>("/jobs", {
      method: "POST",
      body: JSON.stringify({ channelId: selectedChannelId, videoId: videoId || undefined, notes: notes || undefined })
    });
    setJobId(result.jobId);
  }

  async function loadJob(): Promise<void> {
    if (!jobId) {
      return;
    }

    const row = await api<Job>(`/jobs/${jobId}`);
    setJob(row);
  }

  async function approveJob(): Promise<void> {
    if (!jobId) {
      return;
    }

    await api(`/jobs/${jobId}/approve`, { method: "POST" });
    await loadJob();
    await refresh();
  }

  async function updateSettings(): Promise<void> {
    if (!selectedChannel) {
      return;
    }

    await api(`/channels/${selectedChannel.id}/settings`, {
      method: "PATCH",
      body: JSON.stringify({
        approvalMode: selectedChannel.approvalMode,
        timezone: selectedChannel.timezone,
        scheduleHourLocal: selectedChannel.scheduleHourLocal,
        scheduleMinuteLocal: selectedChannel.scheduleMinuteLocal,
        maxRunsPerDay: selectedChannel.maxRunsPerDay,
        maxRunsPerMonth: selectedChannel.maxRunsPerMonth
      })
    });
    await refresh();
  }

  return (
    <div className="shell">
      <header className="hero">
        <h1>YT Agent Console</h1>
        <p>Connect channels, schedule daily optimization, review AI suggestions, and track audit and quota.</p>
        <button onClick={connectYouTube}>Connect YouTube</button>
      </header>

      <section className="card">
        <h2>Channel Settings</h2>
        <select value={selectedChannelId} onChange={(e) => setSelectedChannelId(e.target.value)}>
          <option value="">Select channel</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>{c.title ?? c.youtubeChannelId}</option>
          ))}
        </select>

        {selectedChannel && (
          <div className="grid">
            <label>
              Approval Mode
              <select
                value={selectedChannel.approvalMode}
                onChange={(e) => {
                  const mode = e.target.value as "AUTO" | "REVIEW";
                  setChannels((prev) => prev.map((c) => (c.id === selectedChannel.id ? { ...c, approvalMode: mode } : c)));
                }}
              >
                <option value="REVIEW">Review Before Apply</option>
                <option value="AUTO">Auto Publish</option>
              </select>
            </label>

            <label>
              Timezone
              <input
                value={selectedChannel.timezone}
                onChange={(e) => setChannels((prev) => prev.map((c) => (c.id === selectedChannel.id ? { ...c, timezone: e.target.value } : c)))}
              />
            </label>

            <label>
              Daily Limit
              <input
                type="number"
                value={selectedChannel.maxRunsPerDay}
                onChange={(e) => setChannels((prev) => prev.map((c) => (c.id === selectedChannel.id ? { ...c, maxRunsPerDay: Number(e.target.value) } : c)))}
              />
            </label>

            <label>
              Monthly Limit
              <input
                type="number"
                value={selectedChannel.maxRunsPerMonth}
                onChange={(e) => setChannels((prev) => prev.map((c) => (c.id === selectedChannel.id ? { ...c, maxRunsPerMonth: Number(e.target.value) } : c)))}
              />
            </label>
          </div>
        )}

        <button onClick={updateSettings} disabled={!selectedChannel}>Save Settings</button>
      </section>

      <section className="card">
        <h2>Run Optimization</h2>
        <input placeholder="Optional video id" value={videoId} onChange={(e) => setVideoId(e.target.value)} />
        <textarea placeholder="Creator notes/transcript" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button onClick={createJob} disabled={!selectedChannelId}>Create Job</button>

        <div className="jobBox">
          <input placeholder="Job id" value={jobId} onChange={(e) => setJobId(e.target.value)} />
          <button onClick={loadJob}>Load Job</button>
          <button onClick={approveJob}>Approve</button>
        </div>

        {job && (
          <pre>{JSON.stringify(job, null, 2)}</pre>
        )}
      </section>

      <section className="card split">
        <div>
          <h2>Audit Logs</h2>
          <pre>{JSON.stringify(audit.slice(0, 20), null, 2)}</pre>
        </div>
        <div>
          <h2>Usage</h2>
          <pre>{JSON.stringify(usage, null, 2)}</pre>
        </div>
      </section>
    </div>
  );
}
