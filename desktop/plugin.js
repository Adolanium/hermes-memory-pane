// src/plugin.jsx
import React, { useEffect, useRef, useState } from "react";
import { host, useValue } from "@hermes/plugin-sdk";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var css = `
.hmp{height:100%;min-height:0;display:flex;flex-direction:column;color:var(--ui-text-primary,#242424);font:13px/1.5 var(--font-sans,system-ui);overflow:auto;scrollbar-color:var(--ui-stroke-secondary,#888) transparent}
.hmp *{box-sizing:border-box}.hmp button,.hmp textarea{font:inherit;color:inherit}
.hmp{--hmp-hover:var(--ui-row-hover-background,color-mix(in srgb,currentColor 7%,transparent));--hmp-muted:var(--ui-text-secondary,#555);--hmp-line:var(--ui-stroke-secondary,#ddd)}
.hmp button{cursor:pointer;border:1px solid transparent;background:transparent;border-radius:4px;padding:2px 7px;font-size:12px;color:var(--hmp-muted)}
.hmp button:hover:not(:disabled){background:var(--hmp-hover);color:var(--ui-text-primary,#242424)}.hmp button:disabled{opacity:.5;cursor:default}
.hmp button.primary{border-color:var(--hmp-line);background:var(--ui-surface-background,#fff);color:var(--ui-text-primary,#242424)}
.hmp button.danger{color:var(--ui-error-foreground,#c03434)}
.hmp :focus-visible{outline:2px solid var(--ui-text-primary,#242424);outline-offset:1px}
.hmp section{padding:12px 14px;border-bottom:1px solid var(--hmp-line)}.hmp section:last-child{border-bottom:0}
.hmp h2{font-size:12px;font-weight:600;margin:0;text-transform:uppercase;letter-spacing:.04em;color:var(--hmp-muted)}
.hmp .head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
.hmp .muted{color:var(--hmp-muted)}.hmp .small{font-size:11px}.hmp p{margin:0}
.hmp .change{padding:8px 0;border-top:1px solid color-mix(in srgb,var(--hmp-line) 60%,transparent)}.hmp .change:first-of-type{border-top:0}
.hmp .meta{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--hmp-muted);margin-bottom:2px}
.hmp .kind{font-weight:600}.hmp .kind.added{color:var(--ui-success-foreground,#278344)}.hmp .kind.removed{color:var(--ui-error-foreground,#c03434)}.hmp .kind.edited{color:var(--ui-accent,#3b6fd8)}
.hmp .text{white-space:pre-wrap;overflow-wrap:anywhere}.hmp .was{white-space:pre-wrap;overflow-wrap:anywhere;color:var(--hmp-muted);text-decoration:line-through;font-size:12px;margin-top:2px}
.hmp .gone{color:var(--hmp-muted);text-decoration:line-through}
.hmp .actions{display:flex;gap:2px;margin:3px 0 0 -7px;flex-wrap:wrap;align-items:center}
.hmp .group{margin-top:10px}.hmp .group:first-of-type{margin-top:0}
.hmp .grouphead{display:flex;align-items:center;gap:8px;margin-bottom:4px}.hmp .grouphead strong{font-weight:600}
.hmp .meter{flex:1;height:3px;border-radius:2px;background:var(--hmp-hover);overflow:hidden}.hmp .meter span{display:block;height:100%;background:var(--hmp-muted)}.hmp .meter.full span{background:var(--ui-error-foreground,#c03434)}
.hmp .count{font-size:11px;color:var(--hmp-muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.hmp .entry{position:relative;padding:6px 8px 6px 12px;margin:0 -8px 0 -12px;border-radius:4px}.hmp .entry:hover{background:var(--hmp-hover)}
.hmp .entry.fresh::before{content:'';position:absolute;left:4px;top:13px;width:4px;height:4px;border-radius:50%;background:var(--ui-accent,#3b6fd8)}
.hmp .tools{position:absolute;right:4px;top:3px;display:flex;gap:2px;align-items:center;padding:1px;border-radius:5px;background:var(--ui-surface-background,#fff);box-shadow:0 0 0 1px var(--hmp-line);opacity:0}.hmp .entry:hover .tools,.hmp .entry:focus-within .tools,.hmp .tools.open{opacity:1}
.hmp textarea{width:100%;min-height:64px;resize:vertical;padding:6px 8px;border:1px solid var(--hmp-line);border-radius:4px;background:var(--ui-surface-background,#fff);line-height:1.45}
.hmp .notice{padding:8px 14px;font-size:12px;border-bottom:1px solid var(--hmp-line);background:var(--hmp-hover)}.hmp .notice.error{color:var(--ui-error-foreground,#c03434)}
.hmp .empty{color:var(--hmp-muted);font-size:12px;padding:2px 0}
.hmp .err{color:var(--ui-error-foreground,#c03434);font-size:12px;margin-top:4px}
`;
var LABELS = { user: "About you", memory: "Notes" };
var KINDS = {
  agent: { added: "Remembered", edited: "Updated", removed: "Forgot" },
  you: { added: "You added", edited: "You edited", removed: "You deleted" }
};
var time = (seconds) => new Date(seconds * 1e3).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
var message = (error) => {
  const text = String(error?.message || error || "");
  try {
    return JSON.parse(text.slice(text.indexOf("{"))).detail || text;
  } catch {
    return text || "Something went wrong. Try again.";
  }
};
function Editor({ initial, onSave, onCancel, label }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.setSelectionRange(initial.length, initial.length);
  }, []);
  async function save() {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSave(value.trim());
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx(
      "textarea",
      {
        ref,
        "aria-label": label,
        value,
        onChange: (e) => setValue(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
          if (e.key === "Escape") onCancel();
        }
      }
    ),
    error && /* @__PURE__ */ jsx("p", { className: "err", role: "alert", children: error }),
    /* @__PURE__ */ jsxs("div", { className: "actions open", children: [
      /* @__PURE__ */ jsx("button", { className: "primary", onClick: save, disabled: busy || !value.trim() || value.trim() === initial, children: busy ? "Saving\u2026" : "Save" }),
      /* @__PURE__ */ jsx("button", { onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ jsx("span", { className: "small muted", children: "Ctrl+Enter" })
    ] })
  ] });
}
function Entry({ text, fresh, onEdit, onRemove }) {
  const [mode, setMode] = useState("");
  const [error, setError] = useState("");
  if (mode === "edit") return /* @__PURE__ */ jsx("div", { className: "entry", children: /* @__PURE__ */ jsx(Editor, { label: "Edit memory", initial: text, onSave: async (v) => {
    await onEdit(v);
    setMode("");
  }, onCancel: () => setMode("") }) });
  async function remove() {
    try {
      await onRemove();
    } catch (e) {
      setError(message(e));
      setMode("");
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: `entry${fresh ? " fresh" : ""}`, title: fresh ? "Changed in this chat" : void 0, children: [
    /* @__PURE__ */ jsx("p", { className: "text", children: text }),
    error && /* @__PURE__ */ jsx("p", { className: "err", role: "alert", children: error }),
    /* @__PURE__ */ jsx("div", { className: `tools${mode ? " open" : ""}`, children: mode === "confirm" ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("span", { className: "small", children: "Delete this memory?" }),
      /* @__PURE__ */ jsx("button", { className: "danger", onClick: remove, children: "Delete" }),
      /* @__PURE__ */ jsx("button", { onClick: () => setMode(""), children: "Keep" })
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("button", { onClick: () => setMode("edit"), children: "Edit" }),
      /* @__PURE__ */ jsx("button", { onClick: () => setMode("confirm"), children: "Delete" })
    ] }) })
  ] });
}
function Change({ change, onRevert, onEdit }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const { kind, actor, before, after, current } = change;
  const shown = kind === "removed" ? before : after;
  async function revert() {
    setBusy(true);
    setError("");
    try {
      await onRevert();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: "change", children: [
    /* @__PURE__ */ jsxs("div", { className: "meta", children: [
      /* @__PURE__ */ jsx("span", { className: `kind ${kind}`, children: KINDS[actor]?.[kind] || kind }),
      /* @__PURE__ */ jsx("span", { children: "\xB7" }),
      /* @__PURE__ */ jsx("span", { children: LABELS[change.target] }),
      /* @__PURE__ */ jsx("span", { children: "\xB7" }),
      /* @__PURE__ */ jsx("time", { children: time(change.created) })
    ] }),
    editing ? /* @__PURE__ */ jsx(Editor, { label: "Edit memory", initial: after, onSave: async (v) => {
      await onEdit(v);
      setEditing(false);
    }, onCancel: () => setEditing(false) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { className: `text${kind !== "removed" && !current ? " gone" : ""}`, children: shown }),
      kind === "edited" && current && /* @__PURE__ */ jsx("p", { className: "was", children: before }),
      kind !== "removed" && !current && /* @__PURE__ */ jsx("p", { className: "small muted", children: "No longer in memory." }),
      error && /* @__PURE__ */ jsx("p", { className: "err", role: "alert", children: error }),
      /* @__PURE__ */ jsxs("div", { className: "actions", children: [
        current && /* @__PURE__ */ jsx("button", { onClick: () => setEditing(true), children: "Edit" }),
        actor === "agent" && (current || kind === "removed") && /* @__PURE__ */ jsx("button", { onClick: revert, disabled: busy, children: busy ? "Undoing\u2026" : kind === "removed" ? "Restore" : "Undo" })
      ] })
    ] })
  ] });
}
function Group({ group, fresh, onAction }) {
  const [adding, setAdding] = useState(false);
  const pct = Math.min(100, Math.round(group.chars / Math.max(1, group.limit) * 100));
  return /* @__PURE__ */ jsxs("div", { className: "group", children: [
    /* @__PURE__ */ jsxs("div", { className: "grouphead", children: [
      /* @__PURE__ */ jsx("strong", { children: LABELS[group.target] }),
      /* @__PURE__ */ jsx("div", { className: `meter${pct >= 90 ? " full" : ""}`, "aria-hidden": "true", children: /* @__PURE__ */ jsx("span", { style: { width: `${pct}%` } }) }),
      /* @__PURE__ */ jsxs("span", { className: "count", title: "Characters used of this memory's limit", children: [
        group.chars.toLocaleString(),
        " / ",
        group.limit.toLocaleString()
      ] }),
      group.enabled && /* @__PURE__ */ jsx("button", { onClick: () => setAdding(true), "aria-label": `Add to ${LABELS[group.target]}`, children: "Add" })
    ] }),
    !group.enabled && /* @__PURE__ */ jsx("p", { className: "empty", children: "Turned off for this profile in memory settings." }),
    group.enabled && !group.entries.length && !adding && /* @__PURE__ */ jsx("p", { className: "empty", children: "Empty." }),
    group.entries.map((text) => /* @__PURE__ */ jsx(
      Entry,
      {
        text,
        fresh: fresh.has(text),
        onEdit: (content) => onAction({ action: "replace", target: group.target, entry: text, content }),
        onRemove: () => onAction({ action: "remove", target: group.target, entry: text })
      },
      text
    )),
    adding && /* @__PURE__ */ jsx("div", { className: "entry", children: /* @__PURE__ */ jsx(Editor, { label: `New entry in ${LABELS[group.target]}`, initial: "", onSave: async (content) => {
      await onAction({ action: "add", target: group.target, content });
      setAdding(false);
    }, onCancel: () => setAdding(false) }) })
  ] });
}
function MemoryPane({ ctx }) {
  const session = useValue(host.state.focusedStoredSessionId || host.state.activeSessionId) || "";
  const profile = useValue(host.state.profile);
  const gateway = useValue(host.state.gateway);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [edited, setEdited] = useState(false);
  const [tick, setTick] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    let gone = false;
    let timer;
    async function refresh() {
      try {
        const response = await ctx.rest(`/state?session=${encodeURIComponent(session)}`, { timeoutMs: 1e4 });
        if (!gone && current === generation.current) {
          setData(response);
          setError("");
        }
      } catch {
        if (!gone) setError("Can't reach the memory pane backend. Enable hermes-memory-pane in Agent plugins, then restart Hermes.");
      } finally {
        if (!gone) timer = setTimeout(refresh, 4e3);
      }
    }
    refresh();
    return () => {
      gone = true;
      clearTimeout(timer);
    };
  }, [ctx, session, profile, gateway, tick]);
  useEffect(() => {
    setEdited(false);
  }, [session]);
  async function send(path, body) {
    generation.current++;
    const response = await ctx.rest(path, { method: "POST", body: { ...body, session }, timeoutMs: 1e4 });
    setData(response);
    setEdited(true);
    setTick((n) => n + 1);
  }
  const action = (body) => send("/entries", body);
  const changes = data?.changes || [];
  const fresh = new Set(changes.filter((c) => c.current).map((c) => c.after));
  return /* @__PURE__ */ jsxs("div", { className: "hmp", "aria-label": "Memory", children: [
    /* @__PURE__ */ jsx("style", { children: css }),
    error && /* @__PURE__ */ jsx("div", { className: "notice error", role: "alert", children: error }),
    edited && /* @__PURE__ */ jsxs("div", { className: "notice", role: "status", children: [
      "Saved. New chats use the updated memory. This chat loaded memory when it started, so tell it here if it should know now. ",
      /* @__PURE__ */ jsx("button", { onClick: () => setEdited(false), children: "Dismiss" })
    ] }),
    /* @__PURE__ */ jsxs("section", { "aria-label": "This chat", children: [
      /* @__PURE__ */ jsxs("div", { className: "head", children: [
        /* @__PURE__ */ jsx("h2", { children: "This chat" }),
        changes.length > 0 && /* @__PURE__ */ jsxs("span", { className: "count", children: [
          changes.length,
          " ",
          changes.length === 1 ? "change" : "changes"
        ] })
      ] }),
      !session ? /* @__PURE__ */ jsx("p", { className: "empty", children: "Open a chat to see what it remembered." }) : !data ? /* @__PURE__ */ jsx("p", { className: "empty", children: error ? "Unavailable." : "Loading\u2026" }) : !changes.length ? /* @__PURE__ */ jsx("p", { className: "empty", children: "Nothing remembered in this chat yet. When Hermes saves, updates or forgets something, it shows up here." }) : changes.map((change) => /* @__PURE__ */ jsx(
        Change,
        {
          change,
          onRevert: () => send("/revert", { id: change.id }),
          onEdit: (content) => action({ action: "replace", target: change.target, entry: change.after, content })
        },
        change.id
      ))
    ] }),
    /* @__PURE__ */ jsxs("section", { "aria-label": "All memory", children: [
      /* @__PURE__ */ jsx("div", { className: "head", children: /* @__PURE__ */ jsx("h2", { children: "All memory" }) }),
      !data ? /* @__PURE__ */ jsx("p", { className: "empty", children: error ? "Unavailable." : "Loading\u2026" }) : [...data.targets].reverse().map((group) => /* @__PURE__ */ jsx(Group, { group, fresh, onAction: action }, group.target))
    ] })
  ] });
}
var plugin_default = {
  id: "hermes-memory-pane",
  name: "Memory",
  register(ctx) {
    ctx.register({ id: "pane", area: "panes", title: "Memory", data: { placement: "right", width: "360px" }, render: () => /* @__PURE__ */ jsx(MemoryPane, { ctx }) });
    ctx.register({ id: "open", area: "palette", data: { id: "hermes-memory-pane.open", label: "Open memory pane", keywords: ["memory", "remember", "user profile"], run: () => {
      if (typeof host.openWorkspace === "function") host.openWorkspace("hermes-memory-pane:viewer", { title: "Memory", render: () => /* @__PURE__ */ jsx(MemoryPane, { ctx }) });
      else host.notify({ kind: "info", message: "Open the Memory pane from the layout tabs." });
    } } });
  }
};
export {
  MemoryPane,
  plugin_default as default
};
