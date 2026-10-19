"""HTTP routes for the pane. Clients name entries by their exact text, never by file path."""

from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .journal import TARGETS, Journal, compare, read_entries
from .recorder import memories_dir

VERSION = "0.1.0"
router = APIRouter()


class EntryRequest(BaseModel):
    action: Literal["add", "replace", "remove"]
    target: Literal["memory", "user"]
    entry: str = Field(default="", max_length=20000)
    content: str = Field(default="", max_length=20000)
    session: str = Field(default="", max_length=512)


class RevertRequest(BaseModel):
    id: int
    session: str = Field(min_length=1, max_length=512)


def load_store():
    from tools.memory_tool import load_on_disk_store
    return load_on_disk_store()


def state(session=""):
    store = load_store()
    entries = read_entries(memories_dir())
    targets = [{
        "target": target,
        "entries": entries[target],
        "chars": len("\n§\n".join(entries[target])),
        "limit": store.user_char_limit if target == "user" else store.memory_char_limit,
        "enabled": store.target_enabled(target),
    } for target in TARGETS]
    changes = Journal().session(session) if session else []
    for change in changes:
        change["current"] = bool(change["after"]) and change["after"] in entries[change["target"]]
    return {"version": VERSION, "targets": targets, "changes": changes}


def apply(session, operation):
    """Run one MemoryStore operation and journal what it actually changed on disk."""
    before = read_entries(memories_dir())
    result = operation(load_store())
    if not result.get("success"):
        raise HTTPException(status_code=422, detail=result.get("error") or "Memory refused the change.")
    Journal().record(session, compare(before, read_entries(memories_dir())), "you")
    return state(session)


@router.get("/state")
def get_state(session: str = Query(default="", max_length=512)):
    return state(session)


@router.post("/entries")
def edit_entry(request: EntryRequest):
    target, entry, content = request.target, request.entry, request.content
    if request.action == "add":
        return apply(request.session, lambda store: store.add(target, content))
    if not entry.strip():
        raise HTTPException(status_code=422, detail="Choose the entry to change.")
    if request.action == "replace":
        return apply(request.session, lambda store: store.replace(target, entry, content, matched_entry=entry))
    return apply(request.session, lambda store: store.remove(target, entry, matched_entry=entry))


@router.post("/revert")
def revert(request: RevertRequest):
    change: Optional[dict] = Journal().get(request.id, request.session)
    if not change:
        raise HTTPException(status_code=404, detail="That change is no longer recorded.")
    target, before, after = change["target"], change["before"], change["after"]
    current = read_entries(memories_dir())[target]
    if after and after not in current:
        raise HTTPException(status_code=409, detail="This entry was changed again since. Edit it directly instead.")
    if change["kind"] == "added":
        return apply(request.session, lambda store: store.remove(target, after, matched_entry=after))
    if change["kind"] == "removed":
        return apply(request.session, lambda store: store.add(target, before))
    return apply(request.session, lambda store: store.replace(target, after, before, matched_entry=after))
