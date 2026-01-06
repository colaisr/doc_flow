"""
Admin API endpoints.
"""
# Import router from admin.py file (parent directory)
import sys
from pathlib import Path

# Import admin.py as a module
admin_py_path = Path(__file__).parent.parent / "admin.py"
if admin_py_path.exists():
    import importlib.util
    spec = importlib.util.spec_from_file_location("app.api.admin_settings", admin_py_path)
    admin_settings = importlib.util.module_from_spec(spec)
    sys.modules["app.api.admin_settings"] = admin_settings
    spec.loader.exec_module(admin_settings)
    router = admin_settings.router
else:
    # Fallback: create empty router if admin.py doesn't exist
    from fastapi import APIRouter
    router = APIRouter()

__all__ = ["router"]

