# INCIDENT REPORT: Material Entry Failure (Server vs Local)

## 1. Analysis of Current State
I have compared the codebase (`app.py`, `deploy.py`) with the active local environment.

*   **Server Code (intended):** The `app.py` file is currently written for the **Linux Production Server** (`45.76.89.61`).
    *   Target Path: `/opt/mazzel/gateway/data/nesting_data.json`
*   **Local Environment (actual):** You are running this on **Windows**.
    *   Actual Path: `c:\Users\razor\Desktop\mazzelos\data\nesting_data.json`

## 2. The Conflict
The application logic is hardcoded to look for the **Server Path** regardless of where it is running.

| Feature | Code Logic | Result on Windows (Local) |
| :--- | :--- | :--- |
| **Material List** | Reads `/opt/mazzel/...` | **Fail** (File not found) -> Returns Empty `[]` |
| **Save Material** | Writes to `/opt/mazzel/...` | **Fail** (Path invalid) -> Error 500 |
| **Deploy Script** | Copies `app.py` as-is | **Success** on Server / **Fail** on Local |

## 3. Why Material Entry Fails
When you click "Kaydet" (Save) in the Material Modal:
1.  Frontend sends JSON to `/api/materials`.
2.  Backend (`app.py`) tries to open `/opt/mazzel/gateway/data/nesting_data.json`.
3.  Python raises `FileNotFoundError` (or path error on Windows).
4.  The request crashes.
5.  Frontend shows generic error or nothing updates.

## 4. Required Solution
We must change `app.py` to be **Environment Agnostic**. It should automatically detect if it's running locally or on the server.

**Proposed Change for `app.py`:**
```python
# Create a robust path resolver
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# If 'data' folder exists in current dir (Local Windows), use it.
# Otherwise default to Server path.
if os.path.exists(os.path.join(BASE_DIR, 'data')):
    DATA_DIR = os.path.join(BASE_DIR, 'data')
else:
    DATA_DIR = '/opt/mazzel/gateway/data'

NESTING_DATA_FILE = os.path.join(DATA_DIR, 'nesting_data.json')
```

This single change will fix:
1.  Material Entry (Local & Server)
2.  Nesting Page "Add Module" button (Local & Server)
3.  Deploy script (No changes needed there)
