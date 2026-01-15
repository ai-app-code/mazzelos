# INCIDENT REPORT: Missing Server Data & Blocking UI

## 1. Problem Confirmation
You are accessing the live server at `https://mazzelworks.com/nesting/`.
Code analysis confirms that the **Data Synchronization is Missing**.

## 2. Root Cause: Empty Server State
1.  **Deployment Script Failure**: The `deploy.py` script copies `app.py`, `templates`, and `static`, but **it explicitly ignores the `data` folder**.
    ```python
    # Existing deploy.py lines 34-36
    run_command(f'scp ... app.py ...')
    run_command(f'scp ... templates ...')
    run_command(f'scp ... static ...')
    # MISSING: scp ... data ...
    ```
2.  **Result**: The server has no `nesting_data.json` file.
3.  **Application Logic**: `app.py` loads an empty list `[]` for materials when the file is missing.
4.  **UI Blocking**: `page_nesting.html` has a safety check:
    ```javascript
    if (materials.length === 0) {
        alert('Önce malzeme listesini kontrol ediniz.'); // Stops here!
        return;
    }
    ```

## 3. Why "Add Module" Doesn't Work
The button is clicked -> JavaScript checks materials -> Materials are empty -> **Alert triggers** (or fails silently if blocked) -> Implementation halts.

## 4. Solution Plan (Immediate)

### Step A: Update Deploy Script
We must modify `deploy.py` to upload your local `data` folder to the server. This will transfer any materials you have defined locally to the live site.

```python
# Add this to deploy.py
run_command(f'ssh {USER}@{SERVER_IP} "mkdir -p {REMOTE_PATH}/data"')
run_command(f'scp -r "{os.path.join(script_dir, "data")}" {USER}@{SERVER_IP}:{REMOTE_PATH}/')
```

### Step B: Remove UI Blocker
We should also modify `page_nesting.html` to be more forgiving. If no materials exist, it should ask the user if they want to create one, or use a "Default Template" material temporarily.

## 5. Next Actions for You
1.  **Approve** the fix for `deploy.py`.
2.  **Run** the deployment script again.
3.  Refresh `mazzelworks.com`.
