"""Standalone Hermes plugin entry point."""


def register(ctx):
    from .memory_pane.recorder import Recorder

    ctx.register_middleware("tool_execution", Recorder().execute)
