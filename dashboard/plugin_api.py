"""Load our bundled package without depending on the agent loader's module name."""

import importlib.util
import sys
from pathlib import Path

package = Path(__file__).resolve().parents[1] / "memory_pane"
name = "_hermes_memory_pane_http"
spec = importlib.util.spec_from_file_location(name, package / "__init__.py", submodule_search_locations=[str(package)])
module = importlib.util.module_from_spec(spec)
sys.modules[name] = module
spec.loader.exec_module(module)
api = importlib.import_module(name + ".api")
router = api.router
