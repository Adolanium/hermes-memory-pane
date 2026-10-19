"""Tool middleware. Snapshots memory around each `memory` call; never changes the call."""

import logging
import time

from .journal import Journal, compare, hermes_home, read_entries

log = logging.getLogger(__name__)


def memories_dir():
    """Where the built-in memory keeps MEMORY.md and USER.md for the active profile."""
    return hermes_home() / "memories"


class Recorder:
    def __init__(self, journal_factory=Journal, dir_factory=memories_dir):
        self.journal_factory, self.dir_factory = journal_factory, dir_factory
        self.last_prune = 0

    def execute(self, *, next_call, args, tool_name="", session_id="", tool_call_id="", **kwargs):
        if tool_name != "memory" or not session_id:
            return next_call(args)
        before = None
        try:
            before = read_entries(self.dir_factory())
        except Exception as exc:
            log.warning("Memory pane could not snapshot memory: %s", exc)

        # Deliberately outside the capture handlers. Exactly once.
        try:
            return next_call(args)
        finally:
            if before is not None:
                try:
                    changes = compare(before, read_entries(self.dir_factory()))
                    journal = self.journal_factory()
                    journal.record(str(session_id), changes, "agent", str(tool_call_id))
                    if time.monotonic() - self.last_prune > 3600:
                        self.last_prune = time.monotonic()
                        journal.prune()
                except Exception as exc:
                    log.warning("Memory pane could not record a memory change: %s", exc)
