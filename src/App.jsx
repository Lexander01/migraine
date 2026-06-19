import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import "./App.css";

const DURATION_UNITS = ["minutes", "hours", "days"];

const COMMON_TRIGGERS = [
  "Stress",
  "Poor sleep",
  "Dehydration",
  "Bright light",
  "Loud noise",
  "Skipped meal",
  "Caffeine",
  "Alcohol",
  "Hormones",
  "Weather change",
];

function formatDateTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function IconLog() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="12 8 12 12 14 14" />
      <path d="M3.05 11a9 9 0 1 1 .5 4M3 16v-5h5" />
    </svg>
  );
}

function EntryForm({ onSaved }) {
  const now = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const [datetime, setDatetime] = useState(localIso);
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState("hours");
  const [triggers, setTriggers] = useState([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleTrigger(t) {
    setTriggers((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!datetime) return setError("Please set a date and time.");
    setSaving(true);
    setError("");
    try {
      await addDoc(collection(db, "migraines"), {
        startedAt: Timestamp.fromDate(new Date(datetime)),
        duration: durationValue ? `${durationValue} ${durationUnit}` : "",
        triggers,
        notes,
        createdAt: Timestamp.now(),
      });
      setDatetime(localIso);
      setDurationValue("");
      setDurationUnit("hours");
      setTriggers([]);
      setNotes("");
      onSaved?.();
    } catch (err) {
      setError("Failed to save. Check your Firebase config.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <h2>Log a Migraine</h2>

      <label>
        Date &amp; Time
        <input
          type="datetime-local"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          required
        />
      </label>

      <label>
        Duration
        <div className="duration-row">
          <input
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 3"
            value={durationValue}
            onChange={(e) => setDurationValue(e.target.value)}
          />
          <div className="select-wrapper">
            <select
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value)}
            >
              {DURATION_UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </label>

      <label>
        Triggers
        <div className="trigger-grid">
          {COMMON_TRIGGERS.map((t) => (
            <button
              key={t}
              type="button"
              className={`trigger-chip ${triggers.includes(t) ? "selected" : ""}`}
              onClick={() => toggleTrigger(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </label>

      <label>
        Notes
        <textarea
          rows={3}
          placeholder="Symptoms, medications taken, how you felt…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="save-btn" disabled={saving}>
        {saving ? "Saving…" : "Save Entry"}
      </button>
    </form>
  );
}

function EntryCard({ entry, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="entry-card">
      <div className="entry-header">
        <span className="entry-date">{formatDateTime(entry.startedAt)}</span>
        {!confirming ? (
          <button className="delete-btn" onClick={() => setConfirming(true)} aria-label="Delete">
            ✕
          </button>
        ) : (
          <span className="confirm-row">
            <button className="confirm-yes" onClick={() => onDelete(entry.id)}>
              Delete
            </button>
            <button className="confirm-no" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </span>
        )}
      </div>
      {entry.duration && (
        <p className="entry-detail">
          <strong>Duration:</strong> {entry.duration}
        </p>
      )}
      {entry.triggers?.length > 0 && (
        <p className="entry-detail">
          <strong>Triggers:</strong> {entry.triggers.join(", ")}
        </p>
      )}
      {entry.notes && (
        <p className="entry-detail entry-notes">{entry.notes}</p>
      )}
    </div>
  );
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("log");

  useEffect(() => {
    const q = query(
      collection(db, "migraines"),
      orderBy("startedAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  async function handleDelete(id) {
    await deleteDoc(doc(db, "migraines", id));
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Migraine Tracker</h1>
      </header>

      <main>
        {view === "log" && (
          <EntryForm onSaved={() => setView("history")} />
        )}

        {view === "history" && (
          <section className="history">
            <h2>Past Migraines</h2>
            {loading && <p className="muted">Loading…</p>}
            {!loading && entries.length === 0 && (
              <p className="muted">No entries yet. Log your first migraine.</p>
            )}
            {entries.map((e) => (
              <EntryCard key={e.id} entry={e} onDelete={handleDelete} />
            ))}
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <button
          className={view === "log" ? "nav-active" : ""}
          onClick={() => setView("log")}
        >
          <IconLog />
          Log
        </button>
        <button
          className={view === "history" ? "nav-active" : ""}
          onClick={() => setView("history")}
        >
          <IconHistory />
          History{entries.length > 0 ? ` (${entries.length})` : ""}
        </button>
      </nav>
    </div>
  );
}
