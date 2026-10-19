"""Profile-local journal of memory changes, shared by the agent and HTTP processes."""

import difflib
import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

TARGETS = {"memory": "MEMORY.md", "user": "USER.md"}
DELIMITER = "\n§\n"  # tools.memory_tool.ENTRY_DELIMITER; kept literal so tests run without Hermes
SCHEMA = """
CREATE TABLE IF NOT EXISTS changes (
 id INTEGER PRIMARY KEY AUTOINCREMENT, session TEXT NOT NULL, created REAL NOT NULL,
 target TEXT NOT NULL, kind TEXT NOT NULL, before TEXT NOT NULL, after TEXT NOT NULL,
 actor TEXT NOT NULL, ref TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS changes_session ON changes(session, id);
"""


def hermes_home():
    from hermes_constants import get_hermes_home
    return Path(get_hermes_home())


def read_entries(memories_dir):
    """{target: [entry, ...]} parsed the way MemoryStore parses its files."""
    entries = {}
    for target, name in TARGETS.items():
        path = Path(memories_dir) / name
        try:
            raw = path.read_text(encoding="utf-8-sig") if path.exists() else ""
        except (OSError, UnicodeDecodeError):
            raise RuntimeError(f"{name} could not be read")
        parsed = (e.strip() for e in raw.split(DELIMITER))
        entries[target] = list(dict.fromkeys(e for e in parsed if e))
    return entries


def compare(before, after):
    """Entry-level changes between two read_entries() results. One call that swaps one entry
    for another is an edit; with several, a removed entry is paired with its most similar
    added entry, so a reworded fact reads as an update."""
    changes = []
    for target in TARGETS:
        old, new = before.get(target, []), after.get(target, [])
        removed = [e for e in old if e not in new]
        added = [e for e in new if e not in old]
        for entry in removed:
            scored = [(difflib.SequenceMatcher(None, entry, a).ratio(), a) for a in added]
            score, match = max(scored, default=(0, None))
            if match is not None and (score >= 0.5 or len(removed) == len(added) == 1):
                added.remove(match)
                changes.append((target, "edited", entry, match))
            else:
                changes.append((target, "removed", entry, ""))
        changes.extend((target, "added", "", entry) for entry in added)
    return changes


class Journal:
    def __init__(self, root=None):
        self.root = Path(root) if root else hermes_home() / "plugin-data" / "hermes-memory-pane"

    @contextmanager
    def connect(self):
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        path = self.root / "changes.sqlite3"
        db = sqlite3.connect(path, timeout=5)
        db.row_factory = sqlite3.Row
        try:
            db.execute("PRAGMA journal_mode=WAL")
            db.executescript(SCHEMA)
            if os.name != "nt":
                os.chmod(path, 0o600)
            with db:
                yield db
        finally:
            db.close()

    def record(self, session, changes, actor, ref=""):
        if not session or not changes:
            return
        now = time.time()
        with self.connect() as db:
            db.executemany("INSERT INTO changes(session,created,target,kind,before,after,actor,ref) VALUES (?,?,?,?,?,?,?,?)",
                           [(session, now, target, kind, before, after, actor, ref) for target, kind, before, after in changes])

    def session(self, session, limit=200):
        with self.connect() as db:
            return [dict(r) for r in db.execute("SELECT * FROM changes WHERE session=? ORDER BY id DESC LIMIT ?", (session, limit))]

    def get(self, change_id, session):
        with self.connect() as db:
            row = db.execute("SELECT * FROM changes WHERE id=? AND session=?", (change_id, session)).fetchone()
            return dict(row) if row else None

    def prune(self, days=90):
        with self.connect() as db:
            db.execute("DELETE FROM changes WHERE created < ?", (time.time() - days * 86400,))
