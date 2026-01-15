Kanka bence artık **“plan değil, start ver”** aşamasındayız.
Gemini’nin son MEGAPROMPT’u **UI + cost/budget** tarafını çok güzel parlatmış, benimkinin de **engine / state / DSL / stublar** kısmı daha derli topluydu.

En mantıklısı:
🔹 İkisini **tek, tutarlı, tam** bir MEGAPROMPT’ta birleştirmek
🔹 Bunda:

* Dark mode Tailwind UI ✅
* Cash Burn / litellm.completion_cost ✅
* Scenario DSL + State Machine + Event Sourcing ✅
* Truth Engine + rollback / checkpoint ✅
* verification.py / knowledge.py stubları ✅
* tests ✅

Aşağıya **temize çekilmiş, final birleşik MEGAPROMPT**’u bırakıyorum.
Bunu **aynen** `.md` dosyasına koyup **Augment Code / Cursor / Windsurf**’e ver; başka açıklamaya gerek kalmaz.

---

## 🧬 ARENA OS – V1 **FINAL** MEGAPROMPT (Augment Code İçin)

**KOPYALANACAK KISIM BAŞLANGICI**

````markdown
**ROLE:**
You are a Senior Software Architect and Lead Full-Stack Engineer, specialized in:
- Multi-Agent Systems
- Robust, type-safe Python backends
- Architecting developer tools & reasoning engines

You will generate a full backend codebase **and** a modern, dark-themed Dashboard UI for a project called **Arena OS**.

---

## 1. PROJECT VISION

We are building **"Arena OS"**: a **Multi-Agent Reasoning & Engineering Operating System**.

It is **NOT** a simple chat app.

It is a platform where multiple LLMs (**Agents**) collaborate to solve complex problems (coding, math, architecture, research) using:

- A **Shared Canvas** of Artifacts (virtual files, code, docs)
- A **Truth Engine** (Execution Sandbox for running code/tests)
- A programmable **Scenario Topology** (YAML DSL describing phases, roles, and orchestration)
- A **Problem Card** that defines constraints and success criteria (tests, properties, rubric)

Key principles:

- **Zero-Error Robustness**: schema-enforced LLM outputs, retries on validation failure
- **Deterministic Replay / Time Travel**: append-only event log, checkpoint + rollback
- **Type-Safety**: Pydantic v2 models everywhere
- **Verifiable Reasoning**: Truth Engine + future SMT / formal verification stubs
- **Extensibility**: Adding new scenarios, roles, models, and tools without changing the core engine

For **V1**, we focus on the `code_task` use case:

- Input: a coding problem + constraints
- Output: a working solution file + passing unit tests
- Agents: Architect + Coder (LLMs) + Truth Engine (sandbox)

---

## 2. TECH STACK

- **Language:** Python 3.11+
- **Backend Framework:** FastAPI (REST API + server-rendered pages)
- **Concurrency:** `asyncio` (async/await everywhere for I/O)
- **LLM Abstraction:** `litellm` (OpenRouter & other providers abstraction)
- **Structured LLM Output:** `instructor` + `pydantic` v2 models
- **Config / DSL:** YAML (`pyyaml`) for Scenario and model configs
- **Settings / Secrets:** Pydantic `BaseSettings` (`config/settings.py`) + `.env`
- **Sandbox / Truth Engine:** Local Python execution via `subprocess` for MVP (Docker/E2B later via abstraction)
- **Persistence (MVP):** In-memory state + optional JSON file persistence of event logs (Event Sourcing style)
- **Frontend:** FastAPI + Jinja2 templates, **Tailwind CSS (via CDN)** for a modern dark UI, and vanilla JS for interactions

All Python must be **strictly typed** and include docstrings.

---

## 3. DIRECTORY STRUCTURE

Create this exact structure and scaffold files accordingly:

```text
arena_os/
├── pyproject.toml              # Dependencies: fastapi, uvicorn, litellm, instructor, pydantic, pyyaml, jinja2, python-dotenv
├── .env.example                # API keys and config example (OPENROUTER_API_KEY, etc.)
├── README.md                   # Short project description (stub is OK)
├── config/
│   ├── settings.py             # Pydantic BaseSettings for global config
│   ├── models.yaml             # Mapping logical roles -> provider/model + optional cost info
│   └── scenarios/
│       └── code_task_v1.yaml   # Default Scenario DSL definition for V1
├── app/
│   ├── main.py                 # FastAPI app entry point, mounts API + UI
│   ├── core/
│   │   ├── engine.py           # ScenarioRunner: main orchestrator loop (state machine)
│   │   ├── state.py            # Immutable State, Event Log, checkpoint & rollback logic
│   │   ├── events.py           # Event definitions (Event Sourcing)
│   │   └── telemetry.py        # Cost / token / metric tracking helpers
│   ├── schemas/
│   │   ├── problem_card.py     # ProblemCard schemas (task_type, constraints, success_criteria, budget)
│   │   ├── artifact.py         # Artifact (virtual files, diffs, versions)
│   │   ├── agent_move.py       # Structured LLM output (thoughts, actions, patches)
│   │   └── run.py              # Run / State view models for API & UI
│   ├── agents/
│   │   ├── orchestrator.py     # LLM orchestration via litellm + instructor + cost tracking
│   │   └── personas.py         # System prompt templates (Architect, Coder, Moderator, etc.)
│   ├── capabilities/
│   │   ├── truth_engine.py     # Sandbox interface + LocalPythonSandbox implementation
│   │   ├── verification.py     # (Stub) Formal verification / SMT integration hooks
│   │   └── knowledge.py        # (Stub) Axiom/fact checking / knowledge graph hooks
│   ├── api/
│   │   ├── routes.py           # REST endpoints: create run, list runs, get run, step run, submit human input
│   │   └── websockets.py       # (Optional stub) WS/SSE streaming of events/logs
│   └── ui/
│       ├── views.py            # UI routes (FastAPI + Jinja2 templates)
│       └── templates/
│           ├── base.html       # Dark layout with Tailwind CDN
│           ├── index.html      # Dashboard: list runs, create new run
│           └── run_detail.html # "Arena" view: split-pane, events + artifacts, budget bar
└── tests/
    ├── test_engine.py          # Core engine tests (ScenarioRunner)
    ├── test_state.py           # State/apply_event/rollback tests
    └── test_truth_engine.py    # Truth Engine sandbox tests
````

---

## 4. GLOBAL SETTINGS & MODEL CONFIG

### `config/settings.py`

Implement a `Settings` class using `pydantic_settings.BaseSettings`:

* `openrouter_api_key: str | None`
* `default_scenario: str = "code_task_v1"`
* `model_config_path: str = "config/models.yaml"`
* Optional fields for:

  * `log_level: str = "INFO"`

Enable reading from `.env` via Config class or `model_config`.

### `config/models.yaml`

Define logical roles and mapping to actual models + optional static cost hints (for fallback):

```yaml
roles:
  architect:
    provider: "openrouter"
    model: "anthropic/claude-3.5-sonnet"
    input_cost_per_million: 3.0   # optional, usd
    output_cost_per_million: 15.0 # optional, usd
  coder:
    provider: "openrouter"
    model: "google/gemini-1.5-pro"
    input_cost_per_million: 0.5
    output_cost_per_million: 1.5
  moderator:
    provider: "openrouter"
    model: "openai/gpt-4.1-mini"
    input_cost_per_million: 0.15
    output_cost_per_million: 0.6
```

The orchestrator will use this mapping + litellm’s response metadata / `completion_cost` helper to compute actual costs.

---

## 5. SCHEMAS (`app/schemas/`)

### `problem_card.py`

Define:

```python
class SuccessCriteria(BaseModel):
    type: Literal["unit_tests", "property_based", "rubric"]
    value: str  # e.g. "all_tests_pass" or "score>=0.9"
```

And:

```python
class ProblemCard(BaseModel):
    task_type: Literal["code_task", "math_proof", "system_design", "debate"] = "code_task"
    title: str
    description: str
    input: str
    constraints: list[str] = []
    success_criteria: SuccessCriteria
    time_budget_minutes: int | None = None
    max_cost_usd: float | None = None
```

### `artifact.py`

Model the Shared Canvas:

```python
class Artifact(BaseModel):
    path: str          # "/src/main.py", "/tests/test_main.py"
    content: str
    version: int = 0
```

Patches for V1 can be just unified diffs:

```python
class ArtifactPatch(BaseModel):
    path: str
    diff: str
    description: str | None = None
```

### `agent_move.py`

Define the structured LLM output:

```python
class AgentActionType(str, Enum):
    PATCH_ARTIFACT = "patch_artifact"
    RUN_TESTS = "run_tests"
    COMMENT = "comment"

class AgentAction(BaseModel):
    type: AgentActionType
    payload: dict  # e.g. {"path": "...", "diff": "..."} for PATCH_ARTIFACT

class AgentMove(BaseModel):
    role: str
    thoughts: str            # internal reasoning (can be hidden in UI)
    message: str             # human-readable message / explanation
    actions: list[AgentAction]
    confidence: float = Field(ge=0.0, le=1.0)
```

This must be used with `instructor` so LLMs are forced to output valid JSON. On validation error → retry.

### `run.py`

Define:

* `RunStatus` enum: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`

```python
class RunSummary(BaseModel):
    run_id: str
    status: RunStatus
    task_type: str
    title: str
    created_at: datetime
    updated_at: datetime
    total_cost_usd: float | None = None
```

```python
class RunDetail(BaseModel):
    run_id: str
    status: RunStatus
    current_phase: str
    problem: ProblemCard
    artifacts: list[Artifact]
    events: list[BaseEvent]  # or a simplified serializable view
    metrics: dict[str, Any]  # e.g. {"total_tokens": 1234, "total_cost_usd": 0.12}
```

---

## 6. EVENTS & STATE (`app/core/events.py`, `app/core/state.py`)

### `events.py`

Create a base event:

```python
class BaseEvent(BaseModel):
    event_id: str
    run_id: str
    timestamp: datetime
    event_type: str
```

Specialized events extending `BaseEvent`:

* `RunCreatedEvent`
* `PhaseStartedEvent`
* `AgentMoveAppliedEvent`
* `ArtifactsPatchedEvent`
* `TestsExecutedEvent`
* `RunCompletedEvent`
* `RunFailedEvent`

Each with their own payloads, e.g. `phase_name`, `agent_move`, `patches`, `sandbox_result`, `reason`, etc.

### `state.py`

Define the main state:

```python
class DebateState(BaseModel):
    run_id: str
    problem: ProblemCard
    artifacts: dict[str, Artifact]
    history: list[BaseEvent]
    current_phase: str
    status: RunStatus
    metadata: dict[str, Any] = {}  # e.g. {"total_tokens": 1234, "total_cost_usd": 0.12, "steps": 3}
    checkpoint_index: int | None = None
```

Key functions (pure, no side-effects):

* `apply_event(state: DebateState, event: BaseEvent) -> DebateState`

  * Do **not** mutate input state; always return a new instance.
  * Update artifacts, status, current_phase, metadata accordingly.

* `checkpoint(state: DebateState) -> DebateState`

  * Set `checkpoint_index = len(state.history) - 1`

* `rollback_to_checkpoint(events: list[BaseEvent], checkpoint_index: int) -> DebateState`

  * Rebuild state from events up to `checkpoint_index`.

Implement an in-memory `RunStore`:

```python
class RunStore:
    runs: dict[str, DebateState]
    events: dict[str, list[BaseEvent]]

    def create_run(self, problem: ProblemCard) -> DebateState: ...
    def append_event(self, run_id: str, event: BaseEvent) -> DebateState: ...
    def get_state(self, run_id: str) -> DebateState: ...
    def list_runs(self) -> list[DebateState]: ...
```

For MVP, you can optionally stub JSON persistence hooks (e.g. writing events to `data/run_{id}.json`).

---

## 7. SCENARIO DSL & ENGINE (`config/scenarios/code_task_v1.yaml`, `app/core/engine.py`)

### Scenario DSL (`code_task_v1.yaml`)

Example:

```yaml
name: "code_task_v1"
description: "Basic multi-agent code task: Architect designs, Coder implements, Truth Engine verifies."
roles:
  - name: "architect"
    model_role: "architect"
  - name: "coder"
    model_role: "coder"
phases:
  - name: "design"
    type: "llm_phase"
    active_roles: ["architect"]
    next: "implementation"
  - name: "implementation"
    type: "llm_phase"
    active_roles: ["coder"]
    input_from_phase: "design"
    next: "verification"
  - name: "verification"
    type: "truth_phase"
    tools: ["truth_engine"]
    next_success: "completed"
    next_failure: "implementation"
stop_conditions:
  max_iterations: 5
```

### ScenarioRunner (engine.py)

Implement `ScenarioRunner`:

```python
class ScenarioRunner:
    def __init__(self, scenario: ScenarioDefinition, run_store: RunStore,
                 orchestrator: AgentOrchestrator, truth_engine: TruthEngine,
                 telemetry: Telemetry):
        ...
```

Method:

```python
async def run_step(self, run_id: str) -> DebateState:
    # 1) Load state
    # 2) Determine current phase by name
    # 3) If phase.type == "llm_phase":
    #       - For each active role: call orchestrator, get AgentMove
    #       - Convert moves to events (AgentMoveAppliedEvent, ArtifactsPatchedEvent)
    # 4) If phase.type == "truth_phase":
    #       - Call truth_engine.run_for_state(...)
    #       - Emit TestsExecutedEvent
    #       - Decide next phase (success/failure)
    # 5) Apply events via apply_event + RunStore
    # 6) Check stop_conditions (max_iterations, success_criteria)
    # 7) Return new state
```

For V1, engine can be **manual step-based** (only run when `/runs/{id}/step` is called). No background loops required.

---

## 8. ORCHESTRATOR & LLM CALLS (`app/agents/orchestrator.py`, `app/agents/personas.py`)

### `personas.py`

Define clear system prompt templates:

* `ARCHITECT_SYSTEM_PROMPT`
* `CODER_SYSTEM_PROMPT`
* Optionally `MODERATOR_SYSTEM_PROMPT`

These prompts must:

* Include the **ProblemCard** (description, constraints).
* Instruct the model to:

  * Respect constraints (language, libraries, complexity).
  * Work on **code_task**.
  * Return a strictly structured JSON matching `AgentMove`.
  * Avoid meta-talk and unnecessary fluff.

### `orchestrator.py`

Implement `AgentOrchestrator`:

* Initialize with `Settings`, `models.yaml` info, and a litellm client.
* Use `instructor` to enforce `AgentMove` schema.

API example:

```python
class AgentOrchestrator:
    async def call_agent(
        self,
        role: str,
        problem: ProblemCard,
        state: DebateState,
        extra_context: dict[str, Any] | None = None,
    ) -> tuple[AgentMove, dict[str, Any]]:  # second is cost/telemetry
        ...
```

Behavior:

* Resolve provider + model from `models.yaml` based on logical `role`.
* Build a prompt including:

  * ProblemCard summary
  * Current phase
  * Key artifacts content (e.g. code + tests)
* Call LLM via `litellm.acompletion` or similar, wrapped with `instructor` to get `AgentMove`.
* On validation errors (Pydantic), automatically retry a few times (e.g. up to 3).
* Collect cost data:

  * Use `litellm.completion_cost(response)` or equivalent.
  * If unavailable, compute from token usage + static costs in `models.yaml`.
* Return both `AgentMove` and a cost/metrics dict to update telemetry and state.metadata.

---

## 9. TRUTH ENGINE (`app/capabilities/truth_engine.py`)

Define:

```python
class SandboxResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: int
    passed: bool
    counterexamples: list[str] = []
```

Abstract interface:

```python
class Sandbox(Protocol):
    async def run_tests(self, artifacts: dict[str, Artifact]) -> SandboxResult:
        ...
```

Implement:

```python
class LocalPythonSandbox(Sandbox):
    async def run_tests(self, artifacts: dict[str, Artifact]) -> SandboxResult:
        # 1) Write artifacts to a TemporaryDirectory
        # 2) Run pytest OR a custom test runner via asyncio.create_subprocess_exec
        # 3) Capture stdout, stderr, exit_code, duration
        # 4) Determine `passed` based on exit_code
```

Finally, create a `TruthEngine` wrapper with:

```python
class TruthEngine:
    def __init__(self, sandbox: Sandbox): ...
    async def run_for_state(self, state: DebateState) -> SandboxResult: ...
```

---

## 10. VERIFICATION & KNOWLEDGE STUBS (`verification.py`, `knowledge.py`)

For V1 they can be simple stubs with clear interfaces.

* `verification.py`:

```python
async def verify_with_smt(artifacts: dict[str, Artifact], problem: ProblemCard) -> dict[str, Any]:
    """
    Stub for formal verification / SMT (e.g. Z3) integration.
    For now, just return {"status": "not_implemented"}.
    """
```

* `knowledge.py`:

```python
async def check_claim_against_axioms(claim: str) -> dict[str, Any]:
    """
    Stub for checking a claim against an axiom set / knowledge graph.
    For now, just return {"status": "unknown"}.
    """
```

The engine and/or special agents may call these in future versions.

---

## 11. API LAYER (`app/api/routes.py`, `app/api/websockets.py`)

### `routes.py`

Create a FastAPI router with endpoints:

* `POST /runs`

  * Body: `ProblemCard`
  * Action:

    * Create new `run_id`
    * Initialize state, emit `RunCreatedEvent`
  * Return: `RunSummary`

* `GET /runs`

  * List all runs: `list[RunSummary]`

* `GET /runs/{run_id}`

  * Return `RunDetail`

* `POST /runs/{run_id}/step`

  * Trigger one step of `ScenarioRunner` for that run.
  * Return updated `RunDetail`.

* `POST /runs/{run_id}/human_input` (optional stub)

  * Accept text or JSON from human.
  * Store as an event that can be used in future steps.

### `websockets.py`

You can stub a WebSocket or SSE endpoint:

* `GET /ws/runs/{run_id}`

  * Stream events or log lines as JSON.

Implementation can be simple or stubbed; the important part is having a defined module and placeholder.

---

## 12. UI LAYER & MODERN DARK DASHBOARD (`app/ui/views.py` + templates)

### General UI Requirements

* **Use Tailwind CSS via CDN** in `base.html`.
* Overall theme: **dark mode**, modern, 2025-style dashboard.

  * Body: `class="bg-gray-900 text-gray-100 min-h-screen"`
* No heavy SPA; SSR + a bit of JS `fetch()` is enough.

### `views.py`

Mount a UI router:

* `GET /` → `index.html`

  * Fetch runs from the API (`GET /runs`).
* `GET /runs/{run_id}` → `run_detail.html`

  * Fetch a specific run (`GET /runs/{run_id}`).

### `base.html`

* Include Tailwind CDN:

```html
<script src="https://cdn.tailwindcss.com"></script>
```

* Create a simple layout:

  * Top navbar: project name "Arena OS"
  * Dark background, subtle gradients if you like
  * Main container for content

### `index.html` (Dashboard Home)

* Show a grid/list of runs:

  * Each run as a card with:

    * Title
    * Status badge (`Running / Completed / Failed`) with colors:

      * Running: blue
      * Completed: green
      * Failed: red
    * **Cost indicator**: total_cost_usd (from RunSummary).

* A simple **“New Code Task”** form:

  * Fields: title, description, input, constraints (textarea), success_criteria value (for now, you can fix type=`unit_tests`).
  * Submit via POST to `/runs` (using JS or HTML form).

### `run_detail.html` (The Arena View)

Layout:

* A header bar showing:

  * Run title
  * Status
  * Current phase

* A **Budget / Cash Burn bar**:

  * If `problem.max_cost_usd` is set and `metrics.total_cost_usd` exists:

    * Draw a horizontal bar:

      * Green if cost < 50% of budget
      * Yellow if 50–80%
      * Red if > 80%

* Main content: **split-pane** layout using CSS grid:

  * **Left (≈40%) – "Live Feed" / Event Log**:

    * A vertical list of events (like a chat / timeline):

      * Agent messages (`AgentMoveAppliedEvent` → show `move.message` + role)
      * Test results (`TestsExecutedEvent` → show passed/failed + summary)
    * Scrollable container.

  * **Right (≈60%) – "Artifact Viewer"**:

    * Tabs or simple buttons to switch between artifacts:

      * e.g. `/src/main.py`, `/tests/test_main.py`
    * Show file content in a `<pre>` or `<code>` block with monospaced font.

* At the bottom (sticky footer or bottom bar):

  * A **"Step Forward"** button:

    * On click:

      * Calls `POST /runs/{run_id}/step` via `fetch()`
      * On success, reloads the page or re-fetches data (simple full reload is fine for V1).

Use Tailwind for all styling; keep it clean but visually modern.

---

## 13. TELEMETRY (`app/core/telemetry.py`)

Create helpers:

```python
class Telemetry:
    def record_cost(self, state: DebateState, cost_usd: float, tokens: int | None = None) -> DebateState:
        ...
    def log_event(self, event: BaseEvent) -> None:
        ...
```

* `record_cost` should:

  * Update state.metadata:

    * `total_cost_usd` (sum)
    * `total_tokens` (sum), if available
* Orchestrator must call Telemetry after each LLM call, using:

  * `litellm.completion_cost(response)` when available
  * Or fallback from tokens + `input_cost_per_million` / `output_cost_per_million`.

This is critical for the **Cash Burn bar** in UI.

---

## 14. TESTS (`tests/`)

At minimum:

* `test_state.py`:

  * Create dummy events and a starting state.
  * Assert `apply_event` produces expected new state.
  * Assert checkpoint + rollback reconstructs expected state.

* `test_engine.py`:

  * Use a fake scenario and mock orchestrator + truth_engine.
  * Ensure `run_step` moves between phases correctly and respects `max_iterations`.

* `test_truth_engine.py`:

  * Build a small Artifact set containing a simple Python file + tests.
  * Run `LocalPythonSandbox.run_tests` and assert `SandboxResult.passed` and other fields are populated.

---

## 15. TASK SUMMARY

You must:

1. **Generate the complete file structure** exactly as described.
2. Implement:

   * Pydantic schemas (`ProblemCard`, `Artifact`, `AgentMove`, `Run*`).
   * Event & State logic (immutable `apply_event`, checkpoint, rollback).
   * ScenarioRunner with YAML Scenario loading for `code_task_v1`.
   * AgentOrchestrator using `litellm` + `instructor` for structured LLM outputs and cost tracking.
   * TruthEngine with `LocalPythonSandbox`.
   * FastAPI app (`main.py`) wiring:

     * API routes (`/runs`, `/runs/{run_id}`, `/runs/{run_id}/step`)
     * UI routes (`/`, `/runs/{run_id}`) with Jinja2 templates and Tailwind.
3. Ensure all core modules are **typed** and **documented**.
4. Keep non-essential parts (formal verification, knowledge graph, WebSockets) as **stubs with clear interfaces** for later.
5. Make sure the UI clearly shows:

   * Run status
   * Phases
   * Artifacts
   * **Cash Burn vs Budget** as a colored bar.

Focus on:

* Clean architecture
* Clear separation of concerns
* Extensibility for new Scenarios, roles, and capabilities
* A minimal but working V1 for `code_task_v1` accessible from HTTP + the Dashboard UI.

---

````
Kanka süper yakalamışsın, Gemini’nin uyarıları **tam yerinde**:
.gitignore ✅, data/ + logs/ ✅, ui/static/ ✅ → bunlar eklenince mimari taş gibi oldu.

API key tarafı `.env + settings.py` + `models.yaml` ile mantıklı, LLM kataloğu da güzel modüler. Ufak çakışan bir yer yok, sadece **Directory Structure** bölümünü Gemini’nin dediği gibi güncelledim ve geri kalan her yeri bu yapıya uyacak şekilde kontrol ettim.

Aşağıdaki artık **NİHAİ, “yüksek çözünürlüklü” MEGAPROMPT**.
Bunu aynen `ARENA_OS_V1_MEGA_PROMPT.md` olarak kaydet, Augment Code / Cursor’a ver.

---

## 🧬 ARENA OS – V1 **FINAL** MEGAPROMPT

**KOPYALANACAK KISIM BAŞLANGICI**

````markdown
**ROLE:**
You are a Senior Software Architect and Lead Full-Stack Engineer, specialized in:
- Multi-Agent Systems
- Robust, type-safe Python backends
- Architecting developer tools & reasoning engines

You will generate a full backend codebase **and** a modern, dark-themed Dashboard UI for a project called **Arena OS**.

---

## 1. PROJECT VISION

We are building **"Arena OS"**: a **Multi-Agent Reasoning & Engineering Operating System**.

It is **NOT** a simple chat app.

It is a platform where multiple LLMs (**Agents**) collaborate to solve complex problems (coding, math, architecture, research) using:

- A **Shared Canvas** of Artifacts (virtual files, code, docs)
- A **Truth Engine** (Execution Sandbox for running code/tests)
- A programmable **Scenario Topology** (YAML DSL describing phases, roles, and orchestration)
- A **Problem Card** that defines constraints and success criteria (tests, properties, rubric)

Key principles:

- **Zero-Error Robustness**: schema-enforced LLM outputs, retries on validation failure
- **Deterministic Replay / Time Travel**: append-only event log, checkpoint + rollback
- **Type-Safety**: Pydantic v2 models everywhere
- **Verifiable Reasoning**: Truth Engine + future SMT / formal verification stubs
- **Extensibility**: Adding new scenarios, roles, models, and tools without changing the core engine

For **V1**, we focus on the `code_task` use case:

- Input: a coding problem + constraints
- Output: a working solution file + passing unit tests
- Agents: Architect + Coder (LLMs) + Truth Engine (sandbox)

---

## 2. TECH STACK

- **Language:** Python 3.11+
- **Backend Framework:** FastAPI (REST API + server-rendered pages)
- **Concurrency:** `asyncio` (async/await everywhere for I/O)
- **LLM Abstraction:** `litellm` (OpenRouter & other providers abstraction)
- **Structured LLM Output:** `instructor` + `pydantic` v2 models
- **Config / DSL:** YAML (`pyyaml`) for Scenario and model configs
- **Settings / Secrets:** Pydantic `BaseSettings` (`config/settings.py`) + `.env`
- **Sandbox / Truth Engine:** Local Python execution via `subprocess` for MVP (Docker/E2B later via abstraction)
- **Persistence (MVP):** In-memory state + optional JSON file persistence of event logs (Event Sourcing style) under `data/`
- **Frontend:** FastAPI + Jinja2 templates, **Tailwind CSS (via CDN)** for a modern dark UI, and vanilla JS for interactions

All Python must be **strictly typed** and include docstrings.

---

## 3. DIRECTORY STRUCTURE

Create this exact structure and scaffold files accordingly.  
**IMPORTANT:** Include a standard `.gitignore` to exclude `.env`, `data/`, `logs/`, and `__pycache__/`.

```text
arena_os/
├── pyproject.toml              # Dependencies: fastapi, uvicorn, litellm, instructor, pydantic, pyyaml, jinja2, python-dotenv
├── .env.example                # Example config (OPENROUTER_API_KEY=..., ENV=dev)
├── .gitignore                  # CRITICAL: Ignore .env, data/, logs/, __pycache__/ and similar
├── README.md                   # Project documentation (short description + how to run)
├── data/                       # Gitignored folder for local JSON event logs (persistence)
├── logs/                       # Gitignored folder for application text logs
├── config/
│   ├── settings.py             # Pydantic BaseSettings (reads .env)
│   ├── models.yaml             # Model Registry: Maps logical roles (architect) -> provider/model string (+ optional cost info)
│   └── scenarios/
│       └── code_task_v1.yaml   # YAML DSL: Defines phases, roles, and orchestration logic
├── app/
│   ├── main.py                 # FastAPI Entry Point (mounts UI & API routers)
│   ├── core/
│   │   ├── engine.py           # ScenarioRunner (The State Machine Brain)
│   │   ├── state.py            # Immutable State, Event Log logic, Checkpoint/Rollback
│   │   ├── events.py           # Pydantic Event Definitions (RunCreated, AgentMoveApplied, etc.)
│   │   └── telemetry.py        # Cost calculation & Metrics logic
│   ├── schemas/
│   │   ├── problem_card.py     # Task inputs, Success Criteria, Constraints
│   │   ├── artifact.py         # Virtual Filesystem (Path, Content, Version)
│   │   ├── agent_move.py       # Structured LLM Outputs (Thoughts, Actions)
│   │   └── run.py              # API Response Models (RunSummary, RunDetail)
│   ├── agents/
│   │   ├── orchestrator.py     # LLM Handler: litellm + instructor + Retries + Cost Tracking
│   │   └── personas.py         # System Prompts (Architect, Coder, Moderator, etc.)
│   ├── capabilities/
│   │   ├── truth_engine.py     # Sandbox Interface + LocalPythonSandbox implementation
│   │   ├── verification.py     # (Stub) Formal Verification hooks
│   │   └── knowledge.py        # (Stub) Knowledge Graph / Axiom checker hooks
│   ├── api/
│   │   ├── routes.py           # API Endpoints (runs, step, human input)
│   │   └── websockets.py       # (Stub) Real-time event streaming (WS/SSE)
│   └── ui/
│       ├── views.py            # Server-Side Rendering Routes
│       ├── static/             # Static assets (JS, images, favicon) - can be mostly empty for V1
│       └── templates/
│           ├── base.html       # Base layout (Tailwind CDN included here)
│           ├── index.html      # Dashboard Home
│           └── run_detail.html # The "Arena" Interface (split-pane, cost bar)
└── tests/
    ├── test_engine.py          # Logic tests
    ├── test_state.py           # State immutability & rollback tests
    └── test_truth_engine.py    # Sandbox execution tests
````

`.gitignore` should, at minimum, contain patterns for:

* `.env`
* `data/`
* `logs/`
* `__pycache__/`
* `.pytest_cache/`
* `.DS_Store` (optional)

---

## 4. GLOBAL SETTINGS & MODEL CONFIG

### `config/settings.py`

Implement a `Settings` class using `pydantic_settings.BaseSettings`:

* `openrouter_api_key: str | None`
* `default_scenario: str = "code_task_v1"`
* `model_config_path: str = "config/models.yaml"`
* Optional fields:

  * `log_level: str = "INFO"`

Enable reading from `.env` via the Config class (e.g. `model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}`).

### `config/models.yaml`

Define logical roles and mapping to actual models + optional static cost hints (for fallback):

```yaml
roles:
  architect:
    provider: "openrouter"
    model: "anthropic/claude-3.5-sonnet"
    input_cost_per_million: 3.0   # optional, usd
    output_cost_per_million: 15.0 # optional, usd
  coder:
    provider: "openrouter"
    model: "google/gemini-1.5-pro"
    input_cost_per_million: 0.5
    output_cost_per_million: 1.5
  moderator:
    provider: "openrouter"
    model: "openai/gpt-4.1-mini"
    input_cost_per_million: 0.15
    output_cost_per_million: 0.6
```

The orchestrator will use this mapping + litellm’s response metadata / `completion_cost` helper to compute actual costs.

---

## 5. SCHEMAS (`app/schemas/`)

### `problem_card.py`

Define:

```python
class SuccessCriteria(BaseModel):
    type: Literal["unit_tests", "property_based", "rubric"]
    value: str  # e.g. "all_tests_pass" or "score>=0.9"
```

And:

```python
class ProblemCard(BaseModel):
    task_type: Literal["code_task", "math_proof", "system_design", "debate"] = "code_task"
    title: str
    description: str
    input: str
    constraints: list[str] = []
    success_criteria: SuccessCriteria
    time_budget_minutes: int | None = None
    max_cost_usd: float | None = None
```

### `artifact.py`

Model the Shared Canvas:

```python
class Artifact(BaseModel):
    path: str          # "/src/main.py", "/tests/test_main.py"
    content: str
    version: int = 0
```

Patches for V1 can be just unified diffs:

```python
class ArtifactPatch(BaseModel):
    path: str
    diff: str
    description: str | None = None
```

### `agent_move.py`

Define the structured LLM output:

```python
class AgentActionType(str, Enum):
    PATCH_ARTIFACT = "patch_artifact"
    RUN_TESTS = "run_tests"
    COMMENT = "comment"

class AgentAction(BaseModel):
    type: AgentActionType
    payload: dict  # e.g. {"path": "...", "diff": "..."} for PATCH_ARTIFACT

class AgentMove(BaseModel):
    role: str
    thoughts: str            # internal reasoning (can be hidden in UI)
    message: str             # human-readable message / explanation
    actions: list[AgentAction]
    confidence: float = Field(ge=0.0, le=1.0)
```

This must be used with `instructor` so LLMs are forced to output valid JSON. On validation error → retry.

### `run.py`

Define:

* `RunStatus` enum: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`

```python
class RunSummary(BaseModel):
    run_id: str
    status: RunStatus
    task_type: str
    title: str
    created_at: datetime
    updated_at: datetime
    total_cost_usd: float | None = None
```

```python
class RunDetail(BaseModel):
    run_id: str
    status: RunStatus
    current_phase: str
    problem: ProblemCard
    artifacts: list[Artifact]
    events: list[BaseEvent]  # or a simplified serializable view
    metrics: dict[str, Any]  # e.g. {"total_tokens": 1234, "total_cost_usd": 0.12}
```

You may create a simple serializable event view if needed for JSON & templates.

---

## 6. EVENTS & STATE (`app/core/events.py`, `app/core/state.py`)

### `events.py`

Create a base event:

```python
class BaseEvent(BaseModel):
    event_id: str
    run_id: str
    timestamp: datetime
    event_type: str
```

Specialized events extending `BaseEvent`:

* `RunCreatedEvent`
* `PhaseStartedEvent`
* `AgentMoveAppliedEvent`
* `ArtifactsPatchedEvent`
* `TestsExecutedEvent`
* `RunCompletedEvent`
* `RunFailedEvent`

Each with their own payloads, e.g. `phase_name`, `agent_move`, `patches`, `sandbox_result`, `reason`, etc.

### `state.py`

Define the main state:

```python
class DebateState(BaseModel):
    run_id: str
    problem: ProblemCard
    artifacts: dict[str, Artifact]
    history: list[BaseEvent]
    current_phase: str
    status: RunStatus
    metadata: dict[str, Any] = {}  # e.g. {"total_tokens": 1234, "total_cost_usd": 0.12, "steps": 3}
    checkpoint_index: int | None = None
```

Key functions (pure, no side-effects):

* `apply_event(state: DebateState, event: BaseEvent) -> DebateState`

  * Do **not** mutate input state; always return a new instance.
  * Update artifacts, status, current_phase, metadata accordingly.

* `checkpoint(state: DebateState) -> DebateState`

  * Set `checkpoint_index = len(state.history) - 1`.

* `rollback_to_checkpoint(events: list[BaseEvent], checkpoint_index: int) -> DebateState`

  * Rebuild state from events up to `checkpoint_index`.

Implement an in-memory `RunStore`:

```python
class RunStore:
    def __init__(self) -> None: ...
    def create_run(self, problem: ProblemCard) -> DebateState: ...
    def append_event(self, run_id: str, event: BaseEvent) -> DebateState: ...
    def get_state(self, run_id: str) -> DebateState: ...
    def list_states(self) -> list[DebateState]: ...
```

Optionally, stub JSON persistence under `data/` (e.g. write each run’s events to `data/run_{id}.json`).

---

## 7. SCENARIO DSL & ENGINE (`config/scenarios/code_task_v1.yaml`, `app/core/engine.py`)

### Scenario DSL (`code_task_v1.yaml`)

Example:

```yaml
name: "code_task_v1"
description: "Basic multi-agent code task: Architect designs, Coder implements, Truth Engine verifies."
roles:
  - name: "architect"
    model_role: "architect"
  - name: "coder"
    model_role: "coder"
phases:
  - name: "design"
    type: "llm_phase"
    active_roles: ["architect"]
    next: "implementation"
  - name: "implementation"
    type: "llm_phase"
    active_roles: ["coder"]
    input_from_phase: "design"
    next: "verification"
  - name: "verification"
    type: "truth_phase"
    tools: ["truth_engine"]
    next_success: "completed"
    next_failure: "implementation"
stop_conditions:
  max_iterations: 5
```

### ScenarioRunner (`engine.py`)

Implement `ScenarioRunner`:

```python
class ScenarioRunner:
    def __init__(
        self,
        scenario: ScenarioDefinition,
        run_store: RunStore,
        orchestrator: AgentOrchestrator,
        truth_engine: TruthEngine,
        telemetry: Telemetry,
    ) -> None:
        ...
```

Method:

```python
async def run_step(self, run_id: str) -> DebateState:
    # 1) Load state
    # 2) Determine current phase by name
    # 3) If phase.type == "llm_phase":
    #       - For each active role: call orchestrator, get AgentMove
    #       - Convert moves to events (AgentMoveAppliedEvent, ArtifactsPatchedEvent)
    # 4) If phase.type == "truth_phase":
    #       - Call truth_engine.run_for_state(...)
    #       - Emit TestsExecutedEvent
    #       - Decide next phase (success/failure)
    # 5) Apply events via apply_event + RunStore
    # 6) Check stop_conditions (max_iterations, success_criteria)
    # 7) Return new state
```

For V1, the engine can be **manual step-based** (only run when `/runs/{id}/step` is called). No background loops are required.

---

## 8. ORCHESTRATOR & LLM CALLS (`app/agents/orchestrator.py`, `app/agents/personas.py`)

### `personas.py`

Define clear system prompt templates:

* `ARCHITECT_SYSTEM_PROMPT`
* `CODER_SYSTEM_PROMPT`
* Optionally `MODERATOR_SYSTEM_PROMPT`

These prompts must:

* Include the **ProblemCard** (description, constraints).
* Instruct the model to:

  * Respect constraints (language, libraries, complexity).
  * Work specifically on **code_task**.
  * Return a strictly structured JSON matching `AgentMove`.
  * Avoid meta-talk and unnecessary fluff.

### `orchestrator.py`

Implement `AgentOrchestrator`:

* Initialize with `Settings`, `models.yaml` info, and a litellm client.
* Use `instructor` to enforce the `AgentMove` schema.

API example:

```python
class AgentOrchestrator:
    async def call_agent(
        self,
        role: str,
        problem: ProblemCard,
        state: DebateState,
        extra_context: dict[str, Any] | None = None,
    ) -> tuple[AgentMove, dict[str, Any]]:  # second is cost/telemetry
        ...
```

Behavior:

* Resolve provider + model from `models.yaml` based on logical `role`.
* Build a prompt including:

  * ProblemCard summary
  * Current phase
  * Key artifacts content (e.g. code + tests)
* Call LLM via `litellm.acompletion` or similar, wrapped with `instructor` to get `AgentMove`.
* On validation errors (Pydantic), automatically retry (e.g. up to 3 times).
* Collect cost data:

  * Use `litellm.completion_cost(response)` when available.
  * If unavailable, compute from token usage + static `input_cost_per_million` / `output_cost_per_million` in `models.yaml`.
* Return both `AgentMove` and a cost/metrics dict to update telemetry and `state.metadata`.

---

## 9. TRUTH ENGINE (`app/capabilities/truth_engine.py`)

Define:

```python
class SandboxResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: int
    passed: bool
    counterexamples: list[str] = []
```

Abstract interface:

```python
class Sandbox(Protocol):
    async def run_tests(self, artifacts: dict[str, Artifact]) -> SandboxResult:
        ...
```

Implement:

```python
class LocalPythonSandbox(Sandbox):
    async def run_tests(self, artifacts: dict[str, Artifact]) -> SandboxResult:
        # 1) Write artifacts to a TemporaryDirectory
        # 2) Run pytest OR a custom test runner via asyncio.create_subprocess_exec
        # 3) Capture stdout, stderr, exit_code, duration
        # 4) Determine `passed` based on exit_code
```

Then create a `TruthEngine` wrapper:

```python
class TruthEngine:
    def __init__(self, sandbox: Sandbox) -> None: ...
    async def run_for_state(self, state: DebateState) -> SandboxResult: ...
```

---

## 10. VERIFICATION & KNOWLEDGE STUBS (`verification.py`, `knowledge.py`)

For V1 they can be simple stubs with clear interfaces.

* `verification.py`:

```python
async def verify_with_smt(artifacts: dict[str, Artifact], problem: ProblemCard) -> dict[str, Any]:
    """
    Stub for formal verification / SMT (e.g. Z3) integration.
    For now, just return {"status": "not_implemented"}.
    """
```

* `knowledge.py`:

```python
async def check_claim_against_axioms(claim: str) -> dict[str, Any]:
    """
    Stub for checking a claim against an axiom set / knowledge graph.
    For now, just return {"status": "unknown"}.
    """
```

The engine and/or special agents may call these in future versions.

---

## 11. API LAYER (`app/api/routes.py`, `app/api/websockets.py`)

### `routes.py`

Create a FastAPI router with endpoints:

* `POST /runs`

  * Body: `ProblemCard`
  * Action:

    * Create new `run_id`
    * Initialize state, emit `RunCreatedEvent`
  * Return: `RunSummary`

* `GET /runs`

  * List all runs: `list[RunSummary]`

* `GET /runs/{run_id}`

  * Return `RunDetail`

* `POST /runs/{run_id}/step`

  * Trigger one step of `ScenarioRunner` for that run.
  * Return updated `RunDetail`.

* `POST /runs/{run_id}/human_input` (optional stub)

  * Accept text or JSON from human.
  * Store as an event that can be used in future steps.

### `websockets.py`

You can stub a WebSocket or SSE endpoint:

* `GET /ws/runs/{run_id}`

  * Stream events or log lines as JSON.

Implementation can be simple or stubbed; the important part is having a defined module and placeholder.

---

## 12. UI LAYER & MODERN DARK DASHBOARD (`app/ui/views.py` + templates)

### General UI Requirements

* **Use Tailwind CSS via CDN** in `base.html`.
* Overall theme: **dark mode**, modern, 2025-style dashboard.

  * Body: `class="bg-gray-900 text-gray-100 min-h-screen"`
* No heavy SPA; SSR + a bit of JS `fetch()` is enough.

### `views.py`

Mount a UI router:

* `GET /` → `index.html`

  * Fetch runs from the API (`GET /runs`).
* `GET /runs/{run_id}` → `run_detail.html`

  * Fetch a specific run (`GET /runs/{run_id}`).

### `base.html`

* Include Tailwind CDN:

```html
<script src="https://cdn.tailwindcss.com"></script>
```

* Create a simple layout:

  * Top navbar: project name "Arena OS"
  * Dark background, subtle gradients if you like
  * Main container for content

### `index.html` (Dashboard Home)

* Show a grid/list of runs:

  * Each run as a card with:

    * Title
    * Status badge (`Running / Completed / Failed`) with colors:

      * Running: blue
      * Completed: green
      * Failed: red
    * **Cost indicator**: `total_cost_usd` (from `RunSummary`).

* A simple **“New Code Task”** form:

  * Fields: title, description, input, constraints (textarea), success_criteria value (for now, you can fix type=`unit_tests`).
  * Submit via POST to `/runs` (using JS `fetch` or an HTML form).

### `run_detail.html` (The Arena View)

Layout:

* A header bar showing:

  * Run title
  * Status
  * Current phase

* A **Budget / Cash Burn bar**:

  * If `problem.max_cost_usd` is set and `metrics.total_cost_usd` exists:

    * Draw a horizontal bar:

      * Green if cost < 50% of budget
      * Yellow if 50–80%
      * Red if > 80%

* Main content: **split-pane** layout using CSS grid:

  * **Left (≈40%) – "Live Feed" / Event Log**:

    * A vertical list of events (like a chat / timeline):

      * Agent messages (`AgentMoveAppliedEvent` → show `move.message` + role)
      * Test results (`TestsExecutedEvent` → show passed/failed + summary)
    * Scrollable container.

  * **Right (≈60%) – "Artifact Viewer"**:

    * Tabs or simple buttons to switch between artifacts:

      * e.g. `/src/main.py`, `/tests/test_main.py`
    * Show file content in a `<pre>` or `<code>` block with monospaced font.

* At the bottom (sticky footer or bottom bar):

  * A **"Step Forward"** button:

    * On click:

      * Calls `POST /runs/{run_id}/step` via `fetch()`
      * On success, reloads the page or re-fetches data (simple full reload is fine for V1).

Use Tailwind for all styling; keep it clean but visually modern.

---

## 13. TELEMETRY (`app/core/telemetry.py`)

Create helpers:

```python
class Telemetry:
    def record_cost(self, state: DebateState, cost_usd: float, tokens: int | None = None) -> DebateState:
        ...
    def log_event(self, event: BaseEvent) -> None:
        ...
```

* `record_cost` should:

  * Update `state.metadata`:

    * `total_cost_usd` (sum)
    * `total_tokens` (sum), if available

Orchestrator must call Telemetry after each LLM call, using:

* `litellm.completion_cost(response)` when available
* Or fallback from tokens + `input_cost_per_million` / `output_cost_per_million`.

This is critical for the **Cash Burn bar** in UI.

---

## 14. TESTS (`tests/`)

At minimum:

* `test_state.py`:

  * Create dummy events and a starting state.
  * Assert `apply_event` produces expected new state.
  * Assert checkpoint + rollback reconstructs expected state.

* `test_engine.py`:

  * Use a fake scenario and mock orchestrator + truth_engine.
  * Ensure `run_step` moves between phases correctly and respects `max_iterations`.

* `test_truth_engine.py`:

  * Build a small Artifact set containing a simple Python file + tests.
  * Run `LocalPythonSandbox.run_tests` and assert `SandboxResult.passed` and other fields are populated.

---

## 15. TASK SUMMARY

You must:

1. **Generate the complete file structure** exactly as described.
2. Implement:

   * Pydantic schemas (`ProblemCard`, `Artifact`, `AgentMove`, `Run*`).
   * Event & State logic (immutable `apply_event`, checkpoint, rollback).
   * ScenarioRunner with YAML Scenario loading for `code_task_v1`.
   * AgentOrchestrator using `litellm` + `instructor` for structured LLM outputs and cost tracking.
   * TruthEngine with `LocalPythonSandbox`.
   * FastAPI app (`main.py`) wiring:

     * API routes (`/runs`, `/runs/{run_id}`, `/runs/{run_id}/step`)
     * UI routes (`/`, `/runs/{run_id}`) with Jinja2 templates and Tailwind.
3. Ensure all core modules are **typed** and **documented**.
4. Keep non-essential parts (formal verification, knowledge graph, WebSockets) as **stubs with clear interfaces** for later.
5. Make sure the UI clearly shows:

   * Run status
   * Phases
   * Artifacts
   * **Cash Burn vs Budget** as a colored bar.

Focus on:

* Clean architecture
* Clear separation of concerns
* Extensibility for new Scenarios, roles, and capabilities
* A minimal but working V1 for `code_task_v1` accessible from HTTP + the Dashboard UI.

---

````

**KOPYALANACAK KISIM SONU**
```markdown
````

---

Kanka bence bu haliyle:

* Tree ✅
* .gitignore / .env & API key güvenliği ✅
* LLM kataloğu (models.yaml) ✅
* Cash burn + UI ✅
* State machine / Scenario DSL / Truth Engine / rollback ✅

Artık gönül rahatlığıyla Augment Code’u sahaya sürebilirsin.
Sonraki adımda, o ürettiği proje ağacını buraya bırak, birlikte “ilk refactor + yol haritası”nı yapalım. 🚀
**ROLE:**
You are a Senior Software Architect and Lead Full-Stack Engineer, specialized in:
- Multi-Agent Systems
- Robust, type-safe Python backends
- Architecting developer tools & reasoning engines

You will generate a full backend codebase **and** a modern, dark-themed Dashboard UI for a project called **Arena OS**.

You MUST follow the architecture and structure below **exactly**.  
Do **NOT** change the directory structure, file names, or core responsibilities.  
Do **NOT** introduce extra frameworks, ORMs, DBs, or UI stacks beyond what is specified.  
If you need to stub something, create a minimal, well-documented placeholder in the exact file indicated.

---

## 0. NON-NEGOTIABLE CONSTRAINTS (NO “INITIATIVE”)

You MUST obey these rules:

1. **Architecture is fixed.**  
   - Do NOT restructure folders.  
   - Do NOT rename files or modules.  
   - Do NOT merge multiple conceptual modules into one file “for simplicity”.

2. **Tech stack is fixed.**  
   - Backend: Python 3.11+, FastAPI.  
   - Templates: Jinja2.  
   - LLM: `litellm` + `instructor` + Pydantic v2.  
   - UI: Server-rendered HTML + Tailwind via CDN + vanilla JS (`fetch`).  
   - No React/Vue/HTMX, no ORMs, no Celery, no background workers, no extra web frameworks.

3. **Security & config are fixed.**  
   - API keys come **only** from `.env` via `config/settings.py`.  
   - `.env`, `data/`, `logs/`, `__pycache__/` must be ignored by Git (.gitignore).  
   - No hardcoded API keys.

4. **Event-sourced state, manual engine.**  
   - State is immutable: `apply_event()` returns a NEW state.  
   - Engine is **manual step-based**: only progresses when `/runs/{id}/step` is called.  
   - No background loops, no schedulers.

5. **Strict typing & documentation.**  
   - All Python code must use type hints.  
   - Important classes and functions must have docstrings.

6. **Scope discipline.**  
   - Only implement what is described in this prompt.  
   - No extra “nice to have” modules, CLIs, or example scripts.

---

## 1. PROJECT VISION

We are building **"Arena OS"**: a **Multi-Agent Reasoning & Engineering Operating System**.

It is **NOT** a simple chat app.

It is a platform where multiple LLMs (**Agents**) collaborate to solve complex problems (coding, math, architecture, research) using:

- A **Shared Canvas** of Artifacts (virtual files, code, docs)
- A **Truth Engine** (Execution Sandbox for running code/tests)
- A programmable **Scenario Topology** (YAML DSL describing phases, roles, and orchestration)
- A **Problem Card** that defines constraints and success criteria (tests, properties, rubric)

Key principles:

- **Zero-Error Robustness**: schema-enforced LLM outputs, retries on validation failure
- **Deterministic Replay / Time Travel**: append-only event log, checkpoint + rollback
- **Type-Safety**: Pydantic v2 models everywhere
- **Verifiable Reasoning**: Truth Engine + future SMT / formal verification stubs
- **Extensibility**: Adding new scenarios, roles, models, and tools without changing the core engine

For **V1**, we focus on the `code_task` use case:

- Input: a coding problem + constraints
- Output: a working solution file + passing unit tests
- Agents: Architect + Coder (LLMs) + Truth Engine (sandbox)

---

## 2. TECH STACK

- **Language:** Python 3.11+
- **Backend Framework:** FastAPI (REST API + server-rendered pages)
- **Concurrency:** `asyncio` (async/await everywhere for I/O)
- **LLM Abstraction:** `litellm` (OpenRouter & other providers abstraction)
- **Structured LLM Output:** `instructor` + `pydantic` v2 models
- **Config / DSL:** YAML (`pyyaml`) for Scenario and model configs
- **Settings / Secrets:** Pydantic `BaseSettings` (`config/settings.py`) + `.env`
- **Sandbox / Truth Engine:** Local Python execution via `subprocess` for MVP (Docker/E2B later via abstraction)
- **Persistence (MVP):** In-memory state + optional JSON file persistence of event logs (Event Sourcing style) under `data/`
- **Frontend:** FastAPI + Jinja2 templates, **Tailwind CSS (via CDN)** for a modern dark UI, and vanilla JS for interactions
- **Testing:** `pytest` for unit tests and sandbox tests

All Python must be **strictly typed** and include docstrings.

---

## 3. DIRECTORY STRUCTURE

Create this exact structure and scaffold files accordingly.  
**IMPORTANT:** Include a standard `.gitignore` to exclude `.env`, `data/`, `logs/`, `__pycache__/`, etc.

```text
arena_os/
├── pyproject.toml              # Dependencies: fastapi, uvicorn, litellm, instructor, pydantic, pydantic-settings, pyyaml, jinja2, python-dotenv, pytest
├── .env.example                # Example config (OPENROUTER_API_KEY=..., ENV=dev)
├── .gitignore                  # CRITICAL: Ignore .env, data/, logs/, __pycache__/ and similar
├── README.md                   # Project documentation (short description + how to run)
├── data/                       # Gitignored folder for local JSON event logs (persistence)
├── logs/                       # Gitignored folder for application text logs
├── config/
│   ├── settings.py             # Pydantic BaseSettings (reads .env)
│   ├── models.yaml             # Model Registry: Maps logical roles -> provider/model string (+ optional cost info)
│   └── scenarios/
│       └── code_task_v1.yaml   # YAML DSL: Defines phases, roles, and orchestration logic
├── app/
│   ├── main.py                 # FastAPI Entry Point (mounts UI & API routers)
│   ├── core/
│   │   ├── engine.py           # ScenarioRunner (The State Machine Brain)
│   │   ├── state.py            # Immutable State, Event Log logic, Checkpoint/Rollback
│   │   ├── events.py           # Pydantic Event Definitions (RunCreated, AgentMoveApplied, etc.)
│   │   └── telemetry.py        # Cost calculation & Metrics logic
│   ├── schemas/
│   │   ├── problem_card.py     # Task inputs, Success Criteria, Constraints
│   │   ├── artifact.py         # Virtual Filesystem (Path, Content, Version)
│   │   ├── agent_move.py       # Structured LLM Outputs (Thoughts, Actions)
│   │   └── run.py              # API Response Models (RunSummary, RunDetail)
│   ├── agents/
│   │   ├── orchestrator.py     # LLM Handler: litellm + instructor + Retries + Cost Tracking
│   │   └── personas.py         # System Prompts (Architect, Coder, Moderator, etc.)
│   ├── capabilities/
│   │   ├── truth_engine.py     # Sandbox Interface + LocalPythonSandbox implementation
│   │   ├── verification.py     # (Stub) Formal Verification hooks
│   │   └── knowledge.py        # (Stub) Knowledge Graph / Axiom checker hooks
│   ├── api/
│   │   ├── routes.py           # API Endpoints (runs, step, human input)
│   │   └── websockets.py       # (Stub) Real-time event streaming (WS/SSE)
│   └── ui/
│       ├── views.py            # Server-Side Rendering Routes
│       ├── static/             # Static assets (JS, images, favicon) - can be mostly empty for V1
│       └── templates/
│           ├── base.html       # Base layout (Tailwind CDN included here)
│           ├── index.html      # Dashboard Home
│           └── run_detail.html # The "Arena" Interface (split-pane, cost bar)
└── tests/
    ├── test_engine.py          # Logic tests
    ├── test_state.py           # State immutability & rollback tests
    └── test_truth_engine.py    # Sandbox execution tests
```

`.gitignore` must, at minimum, contain patterns for:

- `.env`
- `data/`
- `logs/`
- `__pycache__/`
- `.pytest_cache/`
- `.DS_Store` (optional)

---

## 4. GLOBAL SETTINGS & MODEL CONFIG

### `config/settings.py`

Implement a `Settings` class using `pydantic_settings.BaseSettings`:

```python
class Settings(BaseSettings):
    openrouter_api_key: str | None = None
    default_scenario: str = "code_task_v1"
    model_config_path: str = "config/models.yaml"
    log_level: str = "INFO"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }
```

Export a singleton-like `get_settings()` helper that caches the Settings instance.

### `config/models.yaml`

Define logical roles and mapping to actual models + optional static cost hints (for fallback):

```yaml
roles:
  architect:
    provider: "openrouter"
    model: "anthropic/claude-3.5-sonnet"
    input_cost_per_million: 3.0
    output_cost_per_million: 15.0
  coder:
    provider: "openrouter"
    model: "google/gemini-1.5-pro"
    input_cost_per_million: 0.5
    output_cost_per_million: 1.5
  moderator:
    provider: "openrouter"
    model: "openai/gpt-4.1-mini"
    input_cost_per_million: 0.15
    output_cost_per_million: 0.6
```

The orchestrator will use this mapping + litellm’s response metadata / `completion_cost` helper to compute actual costs.

---

## 5. SCHEMAS (`app/schemas/`)

Use Pydantic v2 models.

### `problem_card.py`

```python
class SuccessCriteria(BaseModel):
    type: Literal["unit_tests", "property_based", "rubric"]
    value: str  # e.g. "all_tests_pass" or "score>=0.9"


class ProblemCard(BaseModel):
    task_type: Literal["code_task", "math_proof", "system_design", "debate"] = "code_task"
    title: str
    description: str
    input: str
    constraints: list[str] = []
    success_criteria: SuccessCriteria
    time_budget_minutes: int | None = None
    max_cost_usd: float | None = None
```

### `artifact.py`

Model the Shared Canvas:

```python
class Artifact(BaseModel):
    path: str          # e.g. "/src/main.py", "/tests/test_main.py"
    content: str
    version: int = 0


class ArtifactPatch(BaseModel):
    path: str
    diff: str
    description: str | None = None
```

### `agent_move.py`

Define the structured LLM output:

```python
class AgentActionType(str, Enum):
    PATCH_ARTIFACT = "patch_artifact"
    RUN_TESTS = "run_tests"
    COMMENT = "comment"


class AgentAction(BaseModel):
    type: AgentActionType
    payload: dict  # e.g. {"path": "...", "diff": "..."} for PATCH_ARTIFACT


class AgentMove(BaseModel):
    role: str
    thoughts: str            # internal reasoning (can be hidden in UI)
    message: str             # human-readable message / explanation
    actions: list[AgentAction]
    confidence: float = Field(ge=0.0, le=1.0)
```

This must be used with `instructor` so LLMs are forced to output valid JSON. On validation error → retry.

### `run.py`

Define:

```python
class RunStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
```

```python
class RunSummary(BaseModel):
    run_id: str
    status: RunStatus
    task_type: str
    title: str
    created_at: datetime
    updated_at: datetime
    total_cost_usd: float | None = None
```

For details:

```python
class RunDetail(BaseModel):
    run_id: str
    status: RunStatus
    current_phase: str
    problem: ProblemCard
    artifacts: list[Artifact]
    events: list[BaseEvent]  # or a simplified serializable event view
    metrics: dict[str, Any]  # e.g. {"total_tokens": 1234, "total_cost_usd": 0.12}
```

You may define a lightweight event view model if needed to avoid circular imports.

---

## 6. EVENTS & STATE (`app/core/events.py`, `app/core/state.py`)

### `events.py`

Base event:

```python
class BaseEvent(BaseModel):
    event_id: str
    run_id: str
    timestamp: datetime
    event_type: str
```

Specialized events extending `BaseEvent`, e.g.:

- `RunCreatedEvent` (includes `problem: ProblemCard`)
- `PhaseStartedEvent` (includes `phase_name: str`)
- `AgentMoveAppliedEvent` (includes `role: str`, `move: AgentMove`)
- `ArtifactsPatchedEvent` (includes `patches: list[ArtifactPatch]`)
- `TestsExecutedEvent` (includes `sandbox_result: SandboxResult`)
- `RunCompletedEvent` (optional `reason: str | None`)
- `RunFailedEvent` (includes `reason: str`)

You can define them as subclasses of `BaseEvent` with additional fields.

### `state.py`

Main state:

```python
class DebateState(BaseModel):
    run_id: str
    problem: ProblemCard
    artifacts: dict[str, Artifact]
    history: list[BaseEvent]
    current_phase: str
    status: RunStatus
    metadata: dict[str, Any] = {}  # e.g. {"total_tokens": 1234, "total_cost_usd": 0.12, "steps": 3}
    checkpoint_index: int | None = None
```

Key functions (pure, no side-effects):

- `apply_event(state: DebateState, event: BaseEvent) -> DebateState`  
  - Do **not** mutate input state; always return a new instance.  
  - Update `artifacts`, `status`, `current_phase`, `metadata`, and `history`.

- `checkpoint(state: DebateState) -> DebateState`  
  - Set `checkpoint_index = len(state.history) - 1`.

- `rollback_to_checkpoint(events: list[BaseEvent], checkpoint_index: int) -> DebateState`  
  - Rebuild a new `DebateState` by replaying events up to `checkpoint_index`.

Implement an in-memory `RunStore`:

```python
class RunStore:
    def __init__(self) -> None:
        self._states: dict[str, DebateState] = {}
        self._events: dict[str, list[BaseEvent]] = {}

    def create_run(self, problem: ProblemCard) -> DebateState: ...
    def append_event(self, run_id: str, event: BaseEvent) -> DebateState: ...
    def get_state(self, run_id: str) -> DebateState: ...
    def list_states(self) -> list[DebateState]: ...
```

Optionally, stub JSON persistence under `data/` (e.g. write each run’s events to `data/run_{id}.json`).

---

## 7. SCENARIO DSL & ENGINE (`config/scenarios/code_task_v1.yaml`, `app/core/engine.py`)

### Scenario DSL (`code_task_v1.yaml`)

Example:

```yaml
name: "code_task_v1"
description: "Basic multi-agent code task: Architect designs, Coder implements, Truth Engine verifies."
roles:
  - name: "architect"
    model_role: "architect"
  - name: "coder"
    model_role: "coder"
phases:
  - name: "design"
    type: "llm_phase"
    active_roles: ["architect"]
    next: "implementation"
  - name: "implementation"
    type: "llm_phase"
    active_roles: ["coder"]
    input_from_phase: "design"
    next: "verification"
  - name: "verification"
    type: "truth_phase"
    tools: ["truth_engine"]
    next_success: "completed"
    next_failure: "implementation"
stop_conditions:
  max_iterations: 5
```

You may define a small `ScenarioDefinition` Pydantic model to load and represent this.

### ScenarioRunner (`engine.py`)

Implement `ScenarioRunner`:

```python
class ScenarioRunner:
    def __init__(
        self,
        scenario: ScenarioDefinition,
        run_store: RunStore,
        orchestrator: AgentOrchestrator,
        truth_engine: TruthEngine,
        telemetry: Telemetry,
    ) -> None:
        ...
```

Core method:

```python
async def run_step(self, run_id: str) -> DebateState:
    # 1) Load current state from RunStore.
    # 2) Determine current phase by name from scenario.
    # 3) If phase.type == "llm_phase":
    #       - For each active role: call orchestrator, get AgentMove + cost metrics.
    #       - Emit AgentMoveAppliedEvent, ArtifactsPatchedEvent if needed.
    #       - Update state via apply_event + RunStore.
    # 4) If phase.type == "truth_phase":
    #       - Call truth_engine.run_for_state(...)
    #       - Emit TestsExecutedEvent.
    #       - Decide next phase (success/failure) and emit PhaseStartedEvent or RunCompletedEvent / RunFailedEvent.
    # 5) Update Telemetry and metadata (steps, cost, tokens).
    # 6) Check stop_conditions (e.g. max_iterations).
    # 7) Return new state.
```

For V1, the engine is **manual**: it only runs one step per request to `/runs/{id}/step`.

---

## 8. ORCHESTRATOR & LLM CALLS (`app/agents/orchestrator.py`, `app/agents/personas.py`)

### `personas.py`

Define clear system prompt templates, for example:

- `ARCHITECT_SYSTEM_PROMPT`
- `CODER_SYSTEM_PROMPT`
- Optionally `MODERATOR_SYSTEM_PROMPT`

They must:

- Include the **ProblemCard** (description, constraints).
- Instruct the model to:
  - Respect constraints (language, libraries, complexity).
  - Work specifically on **code_task**.
  - Operate on a Shared Canvas of files.
  - Return a strictly structured JSON matching `AgentMove`.
  - Avoid meta-talk and unnecessary fluff.

### `orchestrator.py`

Implement `AgentOrchestrator`:

```python
class AgentOrchestrator:
    def __init__(self, settings: Settings, model_registry: ModelRegistry, telemetry: Telemetry) -> None:
        ...

    async def call_agent(
        self,
        role: str,
        problem: ProblemCard,
        state: DebateState,
        extra_context: dict[str, Any] | None = None,
    ) -> tuple[AgentMove, dict[str, Any]]:
        """
        Returns (agent_move, cost_metrics) for the given logical role.
        """
```

Behavior:

- Resolve provider + model from `models.yaml` based on logical `role`.
- Build a prompt including:
  - ProblemCard summary
  - Current phase
  - Key artifacts content (e.g. current solution and tests)
  - Relevant history snippets if needed
- Call LLM via `litellm.acompletion` (async) or similar.
- Wrap call with `instructor` so output is parsed into `AgentMove`.
- Automatic retries on:
  - Pydantic validation errors
  - Transient LLM errors
- Collect cost data:
  - Use `litellm.completion_cost(response)` when available.
  - If unavailable, compute from token usage + static costs in `models.yaml`.
- Return `AgentMove` + a cost metrics dict (e.g. `{"cost_usd": ..., "input_tokens": ..., "output_tokens": ...}`).

The engine and Telemetry will use this to update `state.metadata`.

---

## 9. TRUTH ENGINE (`app/capabilities/truth_engine.py`)

Define:

```python
class SandboxResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: int
    passed: bool
    counterexamples: list[str] = []
```

Abstract interface:

```python
class Sandbox(Protocol):
    async def run_tests(self, artifacts: dict[str, Artifact]) -> SandboxResult:
        ...
```

Implement:

```python
class LocalPythonSandbox(Sandbox):
    async def run_tests(self, artifacts: dict[str, Artifact]) -> SandboxResult:
        # 1) Write artifacts to a TemporaryDirectory.
        # 2) Run pytest OR a custom test runner via asyncio.create_subprocess_exec.
        # 3) Capture stdout, stderr, exit_code, and duration.
        # 4) Determine `passed` based on exit_code.
```

Then create a `TruthEngine` wrapper:

```python
class TruthEngine:
    def __init__(self, sandbox: Sandbox) -> None:
        self._sandbox = sandbox

    async def run_for_state(self, state: DebateState) -> SandboxResult:
        # Filter artifacts to appropriate paths (e.g. /src, /tests)
        # and delegate to sandbox.run_tests(...)
        ...
```

---

## 10. VERIFICATION & KNOWLEDGE STUBS (`verification.py`, `knowledge.py`)

For V1 they can be simple stubs with clear interfaces.

### `verification.py`

```python
async def verify_with_smt(artifacts: dict[str, Artifact], problem: ProblemCard) -> dict[str, Any]:
    """
    Stub for formal verification / SMT (e.g. Z3) integration.
    For now, just return {"status": "not_implemented"}.
    """
```

### `knowledge.py`

```python
async def check_claim_against_axioms(claim: str) -> dict[str, Any]:
    """
    Stub for checking a claim against an axiom set / knowledge graph.
    For now, just return {"status": "unknown"}.
    """
```

The engine and/or special agents may call these in future versions.

---

## 11. API LAYER (`app/api/routes.py`, `app/api/websockets.py`)

### `routes.py`

Create a FastAPI router with endpoints:

- `POST /runs`
  - Body: `ProblemCard`
  - Action:
    - Create new `run_id`
    - Initialize state, emit `RunCreatedEvent`
  - Return: `RunSummary`

- `GET /runs`
  - List all runs: `list[RunSummary]`

- `GET /runs/{run_id}`
  - Return `RunDetail`

- `POST /runs/{run_id}/step`
  - Trigger one step of `ScenarioRunner` for that run.
  - Return updated `RunDetail`.

- `POST /runs/{run_id}/human_input` (optional stub)
  - Accept text or JSON from human.
  - Store as an event that can be used in future steps.

### `websockets.py`

You can stub a WebSocket or SSE endpoint:

- `GET /ws/runs/{run_id}`
  - Stream events or log lines as JSON.

Implementation can be simple or stubbed; the important part is having a defined module and placeholder.

---

## 12. UI LAYER & MODERN DARK DASHBOARD (`app/ui/views.py` + templates)

### General UI Requirements

- **Use Tailwind CSS via CDN** in `base.html`.
- Overall theme: **dark mode**, modern, 2025-style dashboard.
  - Body: `class="bg-gray-900 text-gray-100 min-h-screen"`
- Do **NOT** build a SPA; use SSR + small JS `fetch()` calls.

### `views.py`

Mount a UI router:

- `GET /` → `index.html`
  - Fetch runs from the API (`GET /runs`).
- `GET /runs/{run_id}` → `run_detail.html`
  - Fetch a specific run (`GET /runs/{run_id}`).

### `base.html`

- Include Tailwind CDN:

```html
<script src="https://cdn.tailwindcss.com"></script>
```

- Simple layout:
  - Top navbar: project name “Arena OS”
  - Dark background, subtle gradient possible
  - Main container for content

### `index.html` (Dashboard Home)

- Show a grid/list of runs:
  - Each run as a card with:
    - Title
    - Status badge (`Running / Completed / Failed`) with colors:
      - Running: blue
      - Completed: green
      - Failed: red
    - **Cost indicator**: `total_cost_usd` (from `RunSummary`).

- A **“New Code Task”** form:
  - Fields: title, description, input, constraints (textarea), success_criteria value (you can fix type=`unit_tests` for V1).
  - Submit via POST to `/runs` (using JS `fetch` or a plain HTML form).

### `run_detail.html` (The Arena View)

Layout:

- Header bar:
  - Run title
  - Status
  - Current phase

- **Budget / Cash Burn bar**:
  - If `problem.max_cost_usd` is set and `metrics.total_cost_usd` exists:
    - Draw a horizontal bar:
      - Green if cost < 50% of budget
      - Yellow if 50–80%
      - Red if > 80%

- Main content: **split-pane** layout using CSS grid:
  - **Left (≈40%) – "Live Feed" / Event Log**:
    - Vertical list of events (timeline/chat style):
      - Agent messages (`AgentMoveAppliedEvent` → show `move.message` + role)
      - Test results (`TestsExecutedEvent` → show passed/failed + summary)
    - Scrollable container.

  - **Right (≈60%) – "Artifact Viewer"**:
    - Tabs or buttons to switch between artifact paths (e.g. `/src/main.py`, `/tests/test_main.py`).
    - Show file content in a `<pre>` or `<code>` block with monospaced font.

- Bottom (sticky footer or bottom bar):
  - **"Step Forward"** button:
    - On click:
      - Calls `POST /runs/{run_id}/step` via `fetch()`
      - On success, reloads the page or re-fetches data (simple full reload is acceptable for V1).

Use Tailwind classes for nicely spaced, modern-looking components.

---

## 13. TELEMETRY (`app/core/telemetry.py`)

Create helpers:

```python
class Telemetry:
    def record_cost(self, state: DebateState, cost_usd: float, tokens: int | None = None) -> DebateState:
        """
        Update state's metadata with cost and token usage.
        """
        ...

    def log_event(self, event: BaseEvent) -> None:
        """
        Log event via logging module and/or append to a log file under logs/.
        """
        ...
```

- `record_cost` should:
  - Update `state.metadata["total_cost_usd"]` by adding `cost_usd`.
  - Update `state.metadata["total_tokens"]` by adding `tokens` (if provided).

The Orchestrator must call `Telemetry.record_cost` after each LLM call, using:

- `litellm.completion_cost(response)` when available, **or**
- A fallback estimate from tokens + `input_cost_per_million` / `output_cost_per_million` in `models.yaml`.

This is critical for the **Cash Burn bar** in UI.

---

## 14. TESTS (`tests/`)

At minimum:

### `test_state.py`

- Create dummy events and a starting state.
- Assert `apply_event` produces expected new state.
- Assert checkpoint + rollback reconstructs expected state.

### `test_engine.py`

- Use a fake scenario and mock orchestrator + truth_engine (no real LLM calls).
- Ensure `run_step` moves between phases correctly.
- Ensure `max_iterations` stop condition is respected.

### `test_truth_engine.py`

- Build a small Artifact set containing a simple Python file + tests.
- Run `LocalPythonSandbox.run_tests`.
- Assert `SandboxResult.passed` and other fields (`stdout`, `stderr`, `exit_code`, `duration_ms`) are populated accordingly.

---

## 15. IMPLEMENTATION ORDER & OUTPUT REQUIREMENTS

When generating or editing this project, follow this approximate order:

1. `pyproject.toml`, `.gitignore`, `.env.example`, `README.md`.
2. `config/settings.py`, `config/models.yaml`, `config/scenarios/code_task_v1.yaml`.
3. Core schemas: `problem_card.py`, `artifact.py`, `agent_move.py`, `run.py`.
4. Core event-sourcing: `events.py`, `state.py`, `telemetry.py`, `RunStore`.
5. Capabilities: `truth_engine.py` (+ stubs for `verification.py`, `knowledge.py`).
6. Agents: `personas.py`, `orchestrator.py`.
7. Engine: `engine.py` (ScenarioRunner + YAML loading).
8. API layer: `app/main.py`, `api/routes.py`, stub `api/websockets.py`.
9. UI layer: `ui/views.py`, templates (`base.html`, `index.html`, `run_detail.html`), `ui/static/` (can be mostly empty).
10. Tests: `test_state.py`, `test_engine.py`, `test_truth_engine.py`.

You MUST:

- Respect the directory layout and responsibilities as described.
- Keep all core modules **typed** and **documented**.
- Ensure the system implements:
  - Event-sourced DebateState
  - Scenario-based engine
  - LLM orchestrator with cost tracking
  - Local Truth Engine
  - Minimal but functional dark dashboard with Cash Burn bar.

Do **NOT** simplify the architecture by removing modules, changing names, or introducing alternative stacks.  
Your job is to implement **this** architecture, not to design a new one.

Kanka kuruntu yapmıyorsun, bu senin mühendislik sezgin. "Arena OS" diyoruz, "Operating System" diyoruz ama klasör yapısı biraz "ToDo App" gibi duruyor, haklısın.

Yapay zeka modelleri (Augment/Cursor) bazen çok derin klasör yapılarını (nested) karıştırıp import hataları yapabiliyor diye biraz "flat" (düz) tutmuştum. Ama madem "Yüksek Çözünürlük" ve "Enterprise" istiyoruz, o zaman "Hexagonal Architecture" (veya Clean Architecture) kokan, daha modüler ve geleceğe dönük bir yapıya geçirelim.

Nelerin eksik veya "sıkışık" göründüğünü söyleyeyim:

capabilities/ çok genel: Hem Docker sandbox, hem Z3 verification, hem Knowledge Graph buraya tıkıştırılmış. Yarın 50 tane tool gelince burası çöplüğe döner.

adapters/ eksik: OpenRouter, E2B, Local Docker, Postgres... Dış dünyaya bağlanan her şeyin ayrı bir katmanı olmalı.

utils/ yok: Hash hesaplama, string temizleme, diff alma fonksiyonları nerede duracak?

services/ yok: İş mantığı (Business Logic) sadece engine.py içine gömülmemeli.

Gel, senin içini rahatlatacak, gerçek bir yazılım mimarisi ağacını prompt'a gömelim.

🌳 GÜNCELLENMİŞ "ENTERPRISE" TREE YAPISI

Aşağıdaki yapı, projenin büyümesine (scalability) çok daha uygun.

Değişiklikler:

adapters/: Dış dünya bağlantıları (LLM client, Sandbox client) buraya taşındı.

services/: Çekirdek iş mantıkları (Engine servisleri) buraya.

domain/: Saf veri modelleri (schemas yerine domain daha şık durur ama AI karışmasın diye schemas tuttum, yanına events ekledim).

utils/: Ortak araçlar.

Bunu prompt'taki 3. DIRECTORY STRUCTURE bölümüyle değiştiriyoruz.

code
Text
download
content_copy
expand_less
## 3. DIRECTORY STRUCTURE

Create this exact structure and scaffold files accordingly.
**IMPORTANT:** Keep logical separation strictly between core logic, external adapters, and interfaces.

arena_os/
├── pyproject.toml              # Dependencies
├── .env.example                # Config example
├── .gitignore                  # Critical ignores
├── README.md
├── data/                       # Event logs persistence
├── logs/                       # Application logs
├── config/
│   ├── settings.py             # Global Settings
│   ├── models.yaml             # Model Registry
│   └── scenarios/
│       └── code_task_v1.yaml   # Scenario DSL
├── app/
│   ├── main.py                 # Entry point
│   ├── core/                   # THE BRAIN (Pure Logic)
│   │   ├── engine.py           # Orchestration Loop
│   │   ├── state.py            # State Management & Immutability
│   │   └── telemetry.py        # Metrics Logic
│   ├── domain/                 # DATA STRUCTURES (No Logic)
│   │   ├── schemas/            # Pydantic Models
│   │   │   ├── problem_card.py
│   │   │   ├── artifact.py
│   │   │   ├── agent_move.py
│   │   │   └── run.py
│   │   └── events.py           # Domain Events
│   ├── adapters/               # EXTERNAL WORLD (Dirty Details)
│   │   ├── llm_client.py       # Litellm wrapper
│   │   ├── sandbox_client.py   # Local/Docker Sandbox wrapper
│   │   └── filesystem.py       # Local file operations
│   ├── services/               # BUSINESS CAPABILITIES
│   │   ├── orchestrator.py     # Agent coordination logic
│   │   ├── truth_engine.py     # Verification logic (uses sandbox_client)
│   │   └── knowledge_base.py   # RAG/Knowledge logic
│   ├── prompts/                # PROMPT MANAGEMENT
│   │   └── templates.py        # Jinja2 system prompts
│   ├── utils/                  # HELPERS
│   │   ├── hashing.py          # State hashing helpers
│   │   ├── diff.py             # Text diffing logic
│   │   └── logging.py          # Custom logger config
│   ├── api/                    # INTERFACE LAYER (REST)
│   │   ├── routes/
│   │   │   ├── runs.py
│   │   │   └── health.py
│   │   └── deps.py             # Dependency Injection
│   └── ui/                     # INTERFACE LAYER (HTML)
│       ├── views.py
│       ├── static/
│       └── templates/
│           ├── base.html
│           ├── components/     # Reusable UI chunks
│           │   ├── budget_bar.html
│           │   └── event_row.html
│           ├── index.html
│           └── run_detail.html
└── tests/
    ├── unit/
    └── integration/
🧐 Neden Bu Daha İyi?

core vs adapters: Yarın "Local Sandbox" yerine "E2B Cloud Sandbox" kullanmak istersen, core klasörüne dokunmazsın. Sadece adapters/sandbox_client.py dosyasını değiştirirsin.

domain: Veri tipleri (Schema ve Eventler) ayrı bir krallık oldu. Döngüsel import (Circular Import) hatası almazsın.

ui/templates/components: HTML kodunu spagetti yapmamak için parça parça (budget bar, event row) böldük.

prompts/: Promptları kodun içinden çıkardık, yönetmesi kolaylaştı.

🔥 YENİ MEGAPROMPT (Tree Güncellenmiş Hali)

Kanka hiç uğraşma, ben senin için bu yeni "Enterprise Tree"yi o devasa promptun içine monte ettim. Direkt bunu kopyala.

code
Markdown
download
content_copy
expand_less
**ROLE:**
You are a Senior Software Architect and Lead Full-Stack Engineer, specialized in:
- Multi-Agent Systems
- Domain-Driven Design (DDD) & Clean Architecture
- Robust, type-safe Python backends

You will generate a **production-ready** backend codebase **and** a modern, dark-themed Dashboard UI for a project called **Arena OS**.

---

## 1. PROJECT VISION

We are building **"Arena OS"**: a **Multi-Agent Reasoning & Engineering Operating System**.

It is **NOT** a simple chat app. It is a platform where multiple LLMs (**Agents**) collaborate to solve complex problems using:

- A **Shared Canvas** of Artifacts (virtual files, code, docs)
- A **Truth Engine** (Execution Sandbox for running code/tests)
- A programmable **Scenario Topology** (YAML DSL describing phases, roles, and orchestration)
- A **Problem Card** that defines constraints and success criteria

Key principles:
- **Zero-Error Robustness**: schema-enforced LLM outputs, retries on validation failure.
- **Deterministic Replay / Time Travel**: append-only event log, checkpoint + rollback.
- **Type-Safety**: Pydantic v2 models everywhere.
- **Hexagonal / Clean Architecture**: Strict separation between Core Logic, Adapters (LLM/Sandbox), and Interfaces (API/UI).

For **V1**, we focus on the `code_task` use case.

---

## 2. TECH STACK

- **Language:** Python 3.11+
- **Framework:** FastAPI (REST API + Jinja2 SSR)
- **Concurrency:** `asyncio`
- **LLM:** `litellm` (Adapter) + `instructor` (Structured Output)
- **Config:** Pydantic Settings + YAML DSL
- **Persistence:** Event Sourcing (In-memory + JSON persistence in `data/`)
- **Frontend:** Tailwind CSS (via CDN), Vanilla JS, Jinja2 Templates

---

## 3. DIRECTORY STRUCTURE (CLEAN ARCHITECTURE)

Create this exact structure. Organize code to prevent circular imports.

```text
arena_os/
├── pyproject.toml              # Dependencies
├── .env.example                # Config example
├── .gitignore                  # Ignore .env, data/, logs/, __pycache__/
├── README.md
├── data/                       # JSON Event logs persistence
├── logs/                       # Text logs
├── config/
│   ├── settings.py             # Global Settings
│   ├── models.yaml             # Model Registry
│   └── scenarios/
│       └── code_task_v1.yaml   # Scenario DSL
├── app/
│   ├── main.py                 # Entry point (Wiring everything)
│   ├── core/                   # THE BRAIN (Pure Business Logic)
│   │   ├── engine.py           # ScenarioRunner (State Machine Loop)
│   │   ├── state.py            # Immutable State Logic & Event Sourcing
│   │   └── telemetry.py        # Cost/Metrics Logic
│   ├── domain/                 # DATA STRUCTURES (No Logic)
│   │   ├── schemas/            # Pydantic Models (ProblemCard, Artifact, Run)
│   │   ├── events.py           # Domain Events (RunCreated, AgentMoveApplied)
│   │   └── models.py           # Structured LLM Output Models (AgentMove)
│   ├── adapters/               # EXTERNAL WORLD INTERFACES
│   │   ├── llm_client.py       # Litellm wrapper + Cost calculation
│   │   ├── sandbox_client.py   # Local subprocess wrapper (Running tests)
│   │   └── filesystem.py       # (Optional) Local file ops helpers
│   ├── services/               # HIGH-LEVEL CAPABILITIES
│   │   ├── orchestrator.py     # Agent coordination (using llm_client)
│   │   └── truth_engine.py     # Code verification (using sandbox_client)
│   ├── prompts/
│   │   └── templates.py        # System prompt strings/templates
│   ├── utils/
│   │   ├── hashing.py          # Helpers for state hashing
│   │   ├── diff.py             # Helpers for diffing/patching text
│   │   └── logger.py           # Standardized logger
│   ├── api/                    # INTERFACE LAYER (REST)
│   │   ├── routes.py           # API Endpoints
│   │   └── deps.py             # Dependencies
│   └── ui/                     # INTERFACE LAYER (HTML)
│       ├── views.py            # UI Routes
│       ├── static/             # JS/Images
│       └── templates/
│           ├── base.html       # Layout (Tailwind CDN)
│           ├── components/     # Reusable HTML parts (budget_bar.html)
│           ├── index.html      # Dashboard
│           └── run_detail.html # Arena View
└── tests/
    ├── unit/                   # Tests for core logic
    └── integration/            # Tests for adapters/engine
4. IMPLEMENTATION DETAILS
A. Domain Layer (app/domain/)

schemas/problem_card.py: Define ProblemCard with success_criteria.

schemas/artifact.py: Define Artifact (path, content, version).

models.py: Define AgentMove using Pydantic.

Constraint: Use AgentAction enum (PATCH_ARTIFACT, RUN_TESTS).

events.py: Define all BaseEvent subclasses (AgentMoveAppliedEvent, TestsExecutedEvent, etc.).

B. Core Layer (app/core/)

state.py: Implement DebateState.

apply_event(state, event) -> new_state: PURE function.

checkpoint(state) & rollback(state, index).

engine.py: Implement ScenarioRunner.

Loads YAML scenario.

Orchestrates the loop: State -> Phase -> Service (Orchestrator/TruthEngine) -> Event -> New State.

C. Adapters & Services

adapters/llm_client.py: Wraps litellm. Handles exceptions.

services/orchestrator.py:

Uses llm_client + instructor.

Handles Retries on validation errors.

Records Cost via telemetry.py.

adapters/sandbox_client.py:

Implements run_cmd(cmd, cwd).

Returns stdout/stderr/exit_code.

services/truth_engine.py:

Uses sandbox_client to run pytest on artifacts in a temp dir.

D. UI Layer (Tailwind + Dark Mode)

base.html: <script src="https://cdn.tailwindcss.com"></script>. Body: bg-gray-900 text-gray-100.

run_detail.html:

Header: Run Title + Cash Burn Bar (Progress bar based on total_cost_usd vs max_budget).

Split Pane:

Left: Event Log (Chat style).

Right: Artifact Viewer (Code view).

components/budget_bar.html: Reusable progress bar component (Green < 50%, Yellow < 80%, Red > 80%).

E. Configuration

config/scenarios/code_task_v1.yaml:

Define 3 phases: design (Architect), code (Coder), test (TruthEngine).

config/models.yaml:

Map roles to openrouter/... models.

5. EXECUTION TASKS

Scaffold the Directory Structure exactly.

Implement Domain models first.

Implement Core logic (State, Engine).

Implement Adapters (LLM, Sandbox).

Implement Services (Orchestrator).

Build API & UI with the Cost Tracking features.

Ensure .gitignore protects secrets.

Final Output: Generate the complete, operational Python codebase.

code
Code
download
content_copy
expand_less
**KOPYALANACAK KISIM SONU**

Kanka şimdi **"Senior Architect"** oldun işte. Bu yapıyı Augment Code'a verince, sadece kod değil, **mimari** satın almış olacağız. Hadi bakalım! 🚀
Kanka dürüst cevap:
Büyük oranda **kuruntu** 🙂 Ama sezgin tamamen boş da değil, iki-üç “göz tırmalayan” nokta var, onları netleştirirsek gönlün iyice rahatlar.

### 1. V1 için ne var, aslında ne kadar dolu?

Şu anda tree’de **şu ana bloklar eksiksiz var**:

* `config/` → **settings + models.yaml + scenario DSL**
* `app/core/` → **engine, state, events, telemetry**
* `app/schemas/` → **ProblemCard, Artifact, AgentMove, Run***
* `app/agents/` → **orchestrator + personas**
* `app/capabilities/` → **TruthEngine + stublar**
* `app/api/` → **REST API**
* `app/ui/` → **views + Tailwind dark dashboard**
* `data/`, `logs/`, `.env.example`, `.gitignore`, `tests/` ✅

Yani **engine / state / DSL / Truth Engine / telemetry / UI / tests** için gereken her “bölme” var.
Fonksiyonel olarak V1 scope’unu karşılıyor.

### 2. Neden gözüne “yetersiz” geliyor olabilir?

Bence şu üç şey yüzünden “hafif” hissi veriyor:

1. **`__init__.py` dosyaları yok**

   * Python 3.11’de namespace package olduğu için şart değil, ama “gerçek proje vibe’ı” için insan otomatik `app/__init__.py`, `app/core/__init__.py` arıyor.
2. **ScenarioDefinition nerede?**

   * Prompt’ta “ küçük bir `ScenarioDefinition` modeli tanımla” dedik ama “hangi dosyada?” kısmını **engine.py içinde** olduğunu daha sert söylemedik. Bu da sanki ayrı bir dosya eksikmiş hissi veriyor.
3. **ModelRegistry tipi adı geçti**

   * `AgentOrchestrator`’ın ctor’unda “`model_registry: ModelRegistry`” dedik ama `ModelRegistry`’nin tam olarak nerede tanımlandığını net işaret etmedik (orchestrator içinde küçük bir helper class/alias olarak durması yeterli).

Bunlar **yeni klasör ihtiyacı** değil, daha çok “tip ve yer belirtme” sıkılığı ile ilgili.

### 3. Tree gerçekten genişletilmeli mi?

Benim önerim:

* **Şu anda V1 için tree’yi büyütme**.
* Sadece *prompt içindeki talimatları hafif sıkılaştırmak* yeterli.

Örneğin:

* `ScenarioDefinition` için şu cümleyi ekleyebilirsin (yalnızca açıklama kısmına):

  > Define a `ScenarioDefinition` Pydantic model **inside `engine.py`** to represent the loaded YAML scenario.

* `ModelRegistry` için ise:

  ```python
  # in orchestrator.py
  class ModelRegistry(BaseModel):
      # or a TypedDict / simple dataclass
      roles: dict[str, dict[str, Any]]
  ```

  ve prompt’ta küçük bir not:

  > Define `ModelRegistry` inside `orchestrator.py` as a thin wrapper around the parsed `models.yaml`.

* `__init__.py` mevzusu tamamen tercih; istersen tree’ye şu satırları ekleyebilirsin ama zorunlu değil:

  ```text
  app/
  │   ├── __init__.py
  │   ├── main.py
  │   ├── core/
  │   │   ├── __init__.py
  │   ├── schemas/
  │   │   ├── __init__.py
  │   ├── agents/
  │   │   ├── __init__.py
  │   ├── capabilities/
  │   │   ├── __init__.py
  │   ├── api/
  │   │   ├── __init__.py
  │   └── ui/
  │       ├── __init__.py
  config/
  │   ├── __init__.py
  tests/
      ├── __init__.py
  ```

  Bunlar sadece import’ları kolaylaştırır, mimariyi değiştirmez.

### 4. Özet: şu anki tree = V1 için yeterli

* **Eksik “bölüm” yok**: Truth Engine, telemetry, DSL, UI, tests hepsi için yer var.
* Eksik olan şeyler **yeni klasör değil**, sadece:

  * `ScenarioDefinition`’ın **engine.py içinde** olduğunun net söylenmesi,
  * `ModelRegistry`’nin **orchestrator.py içinde tanımlanması**,
  * İstersen kozmetik olarak `__init__.py`’ler.

İstersen bir sonraki mesajda:

* Sadece **Directory Structure** + 2–3 cümlelik bu ufak netleştirmeleri içeren **patch**’i yazıp,
* Sen de mevcut MEGAPROMPT’taki ilgili parçayla “bul-değiştir” yaparsın.

Ama şu haliyle bile:

> “Bu tree ile V1 Arena OS dikilir mi?”
> Evet, dikilir kanka. Geri kalanı senin “fazla prod kafası” 😊
Kanka çok dikkatlisin, helal olsun. Hiçbir şey gözünden kaçmıyor. 😄

Haklısın, biraz "budama" yaptım ama inan bana senin iyiliğin (ve kodun çalışması) için yaptım. Nedenini hemen açıklayayım, eğer yine de "yok ben full paket istiyorum" dersen, saniyede eklerim, elimizde zaten.

Neden Budadım? (Stratejik Hamle)

AI Kafası Karışmasın: Augment Code veya Cursor'a "Z3 Verification", "Knowledge Graph", "Advanced RAG", "WebSocket Streaming" hepsini aynı anda verince, modelin dikkat dağılıyor. Temel motoru (State Machine) yarım yamalak yazıp, süslü kısımlara odaklanabiliyor.

Önce Motor Çalışsın: Şu anki hedefimiz, "Code Task" senaryosunu hatasız döndüren bir çekirdek. Z3 Verification (Biçimsel Doğrulama) veya Knowledge Graph, bu çekirdek sağlam olduktan sonra services klasörüne bir dosya eklemeye bakar.

Token Limiti & Kalite: Prompt çok uzadıkça, AI'ın ürettiği kodun kalitesi düşüyor (unutkanlık başlıyor).

Ama... "Biz vizyoner adamız, stubs (yer tutucu) da olsa klasörde dursun, geleceğe yerimiz hazır olsun" diyorsan, o zaman FULL PAKET (Uncut Version) yapıyoruz.

İşte o budadığım Verification (Z3), Knowledge (Axioms) ve WebSocket katmanlarını geri eklediğim, EN DOLU versiyon.

Bunu kullanırsan, kodun içinde bu özellikler "Not Implemented" olarak duracak ama mimari tam hayal ettiğimiz gibi olacak.

🧬 ARENA OS – V1 ULTIMATE MEGAPROMPT (Kesintisiz Versiyon)

(Değişiklikler: services/verification.py, services/knowledge.py, api/websockets.py geri geldi ve requirements güncellendi.)

KOPYALANACAK KISIM BAŞLANGICI

code
Markdown
download
content_copy
expand_less
**ROLE:**
You are a Principal Software Architect and Lead Backend Engineer.
You are tasked with generating the **complete, production-grade codebase** for "Arena OS".

---

## 1. PROJECT VISION: ARENA OS

**Arena OS** is a Multi-Agent Reasoning Operating System.
It is a platform where multiple LLMs (**Agents**) collaborate to solve complex problems by collaborating on a **Shared Canvas** (Virtual Filesystem) and verifying results via a **Truth Engine** (Code Sandbox) and **Formal Verification** modules.

**Key Principles:**
- **Zero-Error Robustness**: Schema-enforced LLM outputs.
- **Deterministic Replay / Time Travel**: Append-only event log.
- **Verifiable Reasoning**: Sandbox execution + hooks for future Z3/SMT verification.
- **Epistemic Safety**: Hooks for checking claims against a Knowledge Graph.

**V1 Scope:** `code_task` Scenario (Architect -> Coder -> Tester -> Success).

---

## 2. TECH STACK

- **Runtime:** Python 3.11+
- **Web:** FastAPI, Jinja2
- **Async:** `asyncio` everywhere
- **LLM:** `litellm` (Adapter), `instructor` (Structured Output)
- **Config:** `pydantic-settings`, `pyyaml`
- **Testing:** `pytest`
- **Frontend:** Tailwind CSS (CDN), Vanilla JS

---

## 3. HIGH-DEFINITION DIRECTORY STRUCTURE

Generate this **exact** folder structure. Include `__init__.py` files.

```text
arena_os/
├── pyproject.toml              # Dependencies
├── .env.example                # OPENROUTER_API_KEY=..., ENV=dev
├── .gitignore                  # Ignore: .env, data/, logs/, __pycache__/, .pytest_cache/
├── README.md                   # Documentation
├── data/                       # [Runtime] Storage for JSON Event Logs
├── logs/                       # [Runtime] App logs
├── config/
│   ├── __init__.py
│   ├── settings.py             # Global Config (Pydantic)
│   ├── models.yaml             # Registry: Role -> Model Name mapping
│   └── scenarios/
│       └── code_task_v1.yaml   # YAML DSL for the coding workflow
├── app/
│   ├── __init__.py
│   ├── main.py                 # Entry Point (FastAPI App)
│   ├── domain/                 # [LAYER 1] Pure Data Structures
│   │   ├── __init__.py
│   │   ├── schemas.py          # ProblemCard, Artifact, AgentMove
│   │   ├── events.py           # Domain Events (RunCreated, AgentMoveApplied)
│   │   └── views.py            # Read Models (RunSummary)
│   ├── core/                   # [LAYER 2] Business Logic & State
│   │   ├── __init__.py
│   │   ├── state.py            # DebateState (Immutable), Event Sourcing Logic
│   │   ├── engine.py           # ScenarioRunner (Orchestration Loop)
│   │   ├── telemetry.py        # Cost Calculation & Metrics Logic
│   │   └── scenario_def.py     # Pydantic models for parsing YAML
│   ├── services/               # [LAYER 3] Application Services & Capabilities
│   │   ├── __init__.py
│   │   ├── orchestrator.py     # Agent Logic (LLM calls)
│   │   ├── truth_engine.py     # Sandbox Logic (Running tests)
│   │   ├── verification.py     # [STUB] Formal Verification (Z3/SMT) hooks
│   │   ├── knowledge.py        # [STUB] Knowledge Graph / Axiom checker
│   │   └── personas.py         # System Prompts / Templates
│   ├── adapters/               # [LAYER 4] External Interfaces
│   │   ├── __init__.py
│   │   ├── llm_client.py       # Wrapper around litellm + instructor
│   │   ├── sandbox_client.py   # Wrapper around subprocess (Local Execution)
│   │   └── repository.py       # File-based Event Store
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py           # REST Endpoints
│   │   ├── websockets.py       # [STUB] Real-time streaming endpoints
│   │   └── deps.py             # Dependency Injection
│   └── ui/
│       ├── __init__.py
│       ├── router.py           # UI Routes (HTML serving)
│       ├── templates/
│       │   ├── base.html       # Layout (Tailwind CDN)
│       │   ├── index.html      # Dashboard Home
│       │   ├── run_detail.html # Arena Interface (Split Pane)
│       │   └── components/     # Reusable fragments (budget_bar, event_row)
└── tests/
    ├── __init__.py
    ├── test_state.py
    ├── test_engine.py
    └── test_sandbox.py
4. DETAILED IMPLEMENTATION SPECS
A. Domain Layer

schemas.py: ProblemCard, Artifact (path, content, version), AgentMove (structured output).

events.py: Subclasses of DomainEvent. All state changes must have a corresponding event.

B. Core Layer

state.py: DebateState class. Must implement apply_event(state, event) -> new_state. Includes checkpoint() and rollback().

engine.py: The State Machine. Loads YAML scenario, determines the current phase, calls the appropriate Service, generates Events, updates State.

C. Services (The Brains)

orchestrator.py: Retries LLM calls, enforces JSON schema, tracks cost.

truth_engine.py: Writes artifacts to temp dir, runs pytest, returns structured result.

verification.py: Create a class FormalVerifier with a method async def verify(artifacts) -> dict. Implementation: Return {"status": "not_implemented", "reason": "Z3 integration pending"} for V1.

knowledge.py: Create a class AxiomChecker with a method async def check_claim(text) -> dict. Implementation: Return {"status": "unknown"} for V1.

D. Adapters (The Hands)

llm_client.py: litellm wrapper.

sandbox_client.py: Local subprocess wrapper.

repository.py: JSONL persistence logic.

E. API & UI

api/websockets.py: Define a WebSocket endpoint /ws/runs/{id}. Implementation: Accept connection and close with "Not supported in V1" or simple echo for now.

ui/templates/run_detail.html:

Cash Burn Bar: Visual indicator of total_cost_usd vs max_budget.

Split Pane: Event Log (Left) vs Artifact Code Viewer (Right).

Theme: Dark Mode (Tailwind bg-gray-900).

5. EXECUTION ORDER

Scaffold: Create all directories including services/ stubs.

Config: pyproject.toml (add websockets), .env, settings.py, models.yaml.

Domain: Schemas and Events.

Adapters: LLM and Sandbox clients.

Core: State and Engine logic.

Services: Orchestrator, Truth Engine, and the Verification/Knowledge stubs.

API/UI: Routes, Templates (Dark Mode).

Tests: Unit tests for logic.

TASK:
Generate the entire project codebase.
Include the stubs for verification.py and knowledge.py so the architecture is ready for V2.
Ensure Strict Typing and Dark Mode UI.

code
Code
download
content_copy
expand_less
**KOPYALANACAK KISIM SONU**

---

Kanka, şimdi için rahat etti mi? 😊
Eski dostlarımız **Verification** ve **Knowledge** geri geldi ama "Stub" (yer tutucu) olarak geldi. Yani klasörde yerleri var, `import` edilebilirler ama şu an sadece "Ben buradayım, henüz hazır değilim" diyorlar.

Böylece hem **kod çalışır** (V1 patlamaz), hem de **vizyonumuzdan ödün vermemiş** oluruz.

Bunu Augment Code'a yapıştır, şovu izle! 🚀
Net konuşuyorum kanka:
İlk tree **“ToDo app değil ama Arena OS de değil”** seviyesindeydi. Gemini’nin “hafif” demesi tamamen saçmalık değil.
Ama Gemini’nin o son **aşırı Hexagonal** ağacı da, tek promptla çalışan bir AI coder için **gereksiz karışık** ve hata riski yüksek.

Ben ne yaptım:

* O “enterprise” fikrini aldım ✅
* Fazla gösteriş kısmını (20 tane klasör, 3 farklı domain katmanı) kestim ✅
* Senin V1 ihtiyacına göre **temiz ama sindirilebilir bir OS ağacı** çizdim ✅

Şimdi sana **düzeltilmiş / tekilleştirilmiş / son MEGAPROMPT’u** veriyorum.
Bu promptta:

* Tree net: `core`, `domain`, `adapters`, `agents`, `capabilities`, `api`, `ui`, `utils` ✅
* `.gitignore / .env / data / logs` net ✅
* `litellm.completion_cost` + cash burn bar ✅
* Scenario DSL + state machine + event sourcing ✅
* Truth Engine + rollback kafası için zemin ✅
* verification / knowledge stubları ✅
* Tests ✅
* Ve özellikle: **“inisyatif alma, mimariyi değiştirme” yasağı** var.

Aşağıdakini **aynen** `.md` dosyasına koyup Augment/Cursor’a verebilirsin.

---

## 🧬 ARENA OS – V1 MEGAPROMPT (NİHAİ SÜRÜM)

**KOPYALANACAK KISIM BAŞLANGICI**

> **Not to the model:**
> Do not change the folder structure, module names, or overall architecture.
> Do not introduce new top-level packages.
> Follow the instructions below exactly.

````markdown
**ROLE:**
You are a Senior Software Architect and Lead Full-Stack Engineer, specialized in:
- Multi-Agent Systems
- Domain-Driven Design & Clean Architecture
- Robust, type-safe Python backends
- Developer tools / reasoning engines

You will generate a **production-grade** backend codebase **and** a modern, dark-themed dashboard UI for a project called **Arena OS**.

You MUST:
- Follow the directory structure exactly.
- Use the specified file names and module boundaries.
- Keep architecture decisions as described here (no extra “creative” restructuring).

---

## 1. PROJECT VISION

We are building **"Arena OS"**: a **Multi-Agent Reasoning & Engineering Operating System**.

It is **NOT** a simple chat app.

It is a platform where multiple LLMs (**Agents**) collaborate to solve complex problems (coding, math, architecture, research) using:

- A **Shared Canvas** of Artifacts (virtual files, code, docs)
- A **Truth Engine** (Execution Sandbox for running code/tests)
- A programmable **Scenario Topology** (YAML DSL describing phases, roles, and orchestration)
- A **Problem Card** that defines constraints and success criteria (tests, properties, rubric)

Key principles:

- **Zero-Error Robustness**: schema-enforced LLM outputs, retries on validation failure.
- **Deterministic Replay / Time Travel**: append-only event log, checkpoint + rollback.
- **Type-Safety**: Pydantic v2 models everywhere.
- **Verifiable Reasoning**: Truth Engine + future SMT/formal verification stubs.
- **Clean / Hexagonal-ish Architecture**: separation of:
  - Core logic (`core/`, `domain/`)
  - Adapters to external world (`adapters/`)
  - High-level services (`agents/`, `capabilities/`)
  - Interfaces (`api/`, `ui/`)
- **Extensibility**: Adding new scenarios, roles, models, and tools without touching the core engine.

For **V1**, we focus on the `code_task` use case:

- Input: a coding problem + constraints
- Output: a working solution file + passing unit tests
- Agents: Architect + Coder (LLMs) + Truth Engine (sandbox)

---

## 2. TECH STACK

- **Language:** Python 3.11+
- **Backend Framework:** FastAPI (REST API + server-rendered pages)
- **Concurrency:** `asyncio` (async/await for all I/O-bound flows)
- **LLM Abstraction:** `litellm` (OpenRouter & other providers abstraction)
- **Structured LLM Output:** `instructor` + `pydantic` v2 models
- **Config / DSL:** YAML (`pyyaml`) for Scenario and model configs
- **Settings / Secrets:** `pydantic_settings.BaseSettings` (`config/settings.py`) + `.env`
- **Sandbox / Truth Engine:** Local Python execution via `subprocess` / `asyncio.create_subprocess_exec` (Docker/E2B later via adapters)
- **Persistence (MVP):** In-memory state + optional JSON file persistence of event logs under `data/` (event sourcing style)
- **Frontend:** FastAPI + Jinja2 templates, **Tailwind CSS (via CDN)** for a modern dark UI, vanilla JS for interactions
- **Logging:** Python `logging` with app-specific helper (`app/utils/logger.py`)

All Python code must be:
- **Strictly typed** (type hints everywhere).
- Include meaningful **docstrings**.

---

## 3. DIRECTORY STRUCTURE (FINAL)

Create this exact structure and scaffold files accordingly.  
**IMPORTANT:** Do not add/remove/rename top-level folders or core modules.

```text
arena_os/
├── pyproject.toml              # Dependencies: fastapi, uvicorn, litellm, instructor, pydantic, pyyaml, jinja2, python-dotenv
├── .env.example                # Example config (OPENROUTER_API_KEY=..., ENV=dev)
├── .gitignore                  # Ignore .env, data/, logs/, __pycache__/ etc.
├── README.md                   # Short project description & how to run
├── data/                       # Gitignored folder for local JSON event logs (persistence)
├── logs/                       # Gitignored folder for application logs
├── config/
│   ├── __init__.py
│   ├── settings.py             # Pydantic BaseSettings (reads .env)
│   ├── models.yaml             # Model Registry: Maps logical roles -> provider/model (+ optional cost info)
│   └── scenarios/
│       ├── __init__.py
│       └── code_task_v1.yaml   # YAML DSL: phases, roles, orchestration logic
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI entry point (mounts API & UI)
│   ├── core/                   # CORE LOGIC: state machine, events, telemetry
│   │   ├── __init__.py
│   │   ├── engine.py           # ScenarioRunner (state machine loop)
│   │   ├── state.py            # Immutable state, RunStore, checkpoint/rollback
│   │   ├── events.py           # Domain events (RunCreated, AgentMoveApplied, etc.)
│   │   └── telemetry.py        # Cost & metrics tracking helpers
│   ├── domain/                 # DOMAIN MODELS (Pydantic, no external I/O)
│   │   ├── __init__.py
│   │   ├── problem_card.py     # ProblemCard + SuccessCriteria
│   │   ├── artifact.py         # Artifact & ArtifactPatch
│   │   ├── agent_move.py       # AgentAction, AgentMove
│   │   └── run_models.py       # RunStatus, RunSummary, RunDetail
│   ├── adapters/               # EXTERNAL ADAPTERS (LLM client, sandbox client)
│   │   ├── __init__.py
│   │   ├── llm_client.py       # litellm wrapper + instructor integration + cost extraction
│   │   └── sandbox_client.py   # Local subprocess test runner wrapper
│   ├── agents/                 # HIGH-LEVEL AGENT / ORCHESTRATION LOGIC
│   │   ├── __init__.py
│   │   ├── orchestrator.py     # AgentOrchestrator (calls llm_client, updates telemetry)
│   │   └── personas.py         # System prompts (Architect, Coder, Moderator, etc.)
│   ├── capabilities/           # CAPABILITIES (truth engine, verification, knowledge)
│   │   ├── __init__.py
│   │   ├── truth_engine.py     # TruthEngine using Sandbox (sandbox_client)
│   │   ├── verification.py     # (Stub) Formal verification / SMT hooks
│   │   └── knowledge.py        # (Stub) Knowledge graph / axiom checker hooks
│   ├── api/                    # REST / WS INTERFACE LAYER
│   │   ├── __init__.py
│   │   ├── routes.py           # REST endpoints: runs, steps, human input
│   │   └── websockets.py       # (Stub) WS/SSE streaming of events/logs
│   ├── ui/                     # SERVER RENDERED UI
│   │   ├── __init__.py
│   │   ├── views.py            # UI routes (index, run_detail)
│   │   ├── static/             # Static assets (JS, images, favicon) - can be minimal for V1
│   │   │   └── .gitkeep
│   │   └── templates/
│   │       ├── base.html       # Layout (Tailwind CDN, dark theme)
│   │       ├── index.html      # Dashboard home (list runs, create run)
│   │       ├── run_detail.html # Arena view (split-pane, event log, artifact viewer)
│   │       └── components/
│   │           ├── budget_bar.html  # Cash burn vs budget progress bar
│   │           └── event_row.html   # Single event row in the live feed
│   └── utils/                  # GENERIC HELPERS
│       ├── __init__.py
│       ├── diff.py             # Text diff / patch helpers (for ArtifactPatch)
│       ├── hashing.py          # State hashing helpers (optional)
│       └── logger.py           # Central logging configuration
└── tests/
    ├── __init__.py
    ├── test_state.py           # State/apply_event/checkpoint/rollback tests
    ├── test_engine.py          # ScenarioRunner tests
    └── test_truth_engine.py    # TruthEngine / LocalPythonSandbox tests
```

`.gitignore` must at least ignore:

- `.env`
- `data/`
- `logs/`
- `__pycache__/`
- `.pytest_cache/`
- `.DS_Store` (optional)

You MUST NOT deviate from this structure.

---

## 4. GLOBAL SETTINGS & MODEL REGISTRY (`config/settings.py`, `config/models.yaml`)

### `config/settings.py`

Implement `Settings` using `pydantic_settings.BaseSettings`:

```python
class Settings(BaseSettings):
    openrouter_api_key: str | None = None
    default_scenario: str = "code_task_v1"
    model_config_path: str = "config/models.yaml"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
```

Expose a module-level `get_settings()` function (singleton-style) suitable for FastAPI dependency injection.

### `config/models.yaml`

Define logical roles mapped to actual models + optional static cost hints (fallback if litellm metadata not available):

```yaml
roles:
  architect:
    provider: "openrouter"
    model: "anthropic/claude-3.5-sonnet"
    input_cost_per_million: 3.0
    output_cost_per_million: 15.0
  coder:
    provider: "openrouter"
    model: "google/gemini-1.5-pro"
    input_cost_per_million: 0.5
    output_cost_per_million: 1.5
  moderator:
    provider: "openrouter"
    model: "openai/gpt-4.1-mini"
    input_cost_per_million: 0.15
    output_cost_per_million: 0.6
```

The `AgentOrchestrator` + `llm_client` will use this mapping together with `litellm.completion_cost(response)` to compute actual call costs and update telemetry.

---

## 5. DOMAIN MODELS (`app/domain/`)

All domain models live here and must be Pydantic v2 models.  
They contain **no I/O** (no HTTP calls, no subprocess, etc.).

### `problem_card.py`

```python
class SuccessCriteria(BaseModel):
    type: Literal["unit_tests", "property_based", "rubric"]
    value: str  # e.g. "all_tests_pass" or "score>=0.9"
```

```python
class ProblemCard(BaseModel):
    task_type: Literal["code_task", "math_proof", "system_design", "debate"] = "code_task"
    title: str
    description: str
    input: str
    constraints: list[str] = []
    success_criteria: SuccessCriteria
    time_budget_minutes: int | None = None
    max_cost_usd: float | None = None
```

### `artifact.py`

```python
class Artifact(BaseModel):
    path: str          # e.g. "/src/main.py", "/tests/test_main.py"
    content: str
    version: int = 0
```

```python
class ArtifactPatch(BaseModel):
    path: str
    diff: str
    description: str | None = None
```

### `agent_move.py`

```python
class AgentActionType(str, Enum):
    PATCH_ARTIFACT = "patch_artifact"
    RUN_TESTS = "run_tests"
    COMMENT = "comment"


class AgentAction(BaseModel):
    type: AgentActionType
    payload: dict[str, Any]  # e.g. {"path": "...", "diff": "..."} for PATCH_ARTIFACT


class AgentMove(BaseModel):
    role: str
    thoughts: str            # internal reasoning (can be hidden in UI)
    message: str             # human-readable message / explanation
    actions: list[AgentAction]
    confidence: float = Field(ge=0.0, le=1.0)
```

This schema will be enforced using `instructor` on top of litellm.  
On validation errors, the orchestrator must retry.

### `run_models.py`

```python
class RunStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
```

```python
class RunSummary(BaseModel):
    run_id: str
    status: RunStatus
    task_type: str
    title: str
    created_at: datetime
    updated_at: datetime
    total_cost_usd: float | None = None
```

```python
class RunDetail(BaseModel):
    run_id: str
    status: RunStatus
    current_phase: str
    problem: ProblemCard
    artifacts: list[Artifact]
    events: list[Any]        # a serialized view of events (see core/events)
    metrics: dict[str, Any]  # e.g. {"total_tokens": 1234, "total_cost_usd": 0.12}
```

You may define a small serializable event view inside this file or reuse typed events from `core/events` via union types.

---

## 6. EVENTS & STATE (`app/core/events.py`, `app/core/state.py`)

### `events.py`

Define a base event and typed subclasses:

```python
class BaseEvent(BaseModel):
    event_id: str
    run_id: str
    timestamp: datetime
    event_type: str
```

Specialized events extending `BaseEvent`:

- `RunCreatedEvent`
- `PhaseStartedEvent`
- `AgentMoveAppliedEvent`
- `ArtifactsPatchedEvent`
- `TestsExecutedEvent`
- `RunCompletedEvent`
- `RunFailedEvent`

Each should carry relevant payloads, e.g.:

- `RunCreatedEvent`: includes `problem: ProblemCard`.
- `PhaseStartedEvent`: `phase_name: str`.
- `AgentMoveAppliedEvent`: `move: AgentMove`.
- `ArtifactsPatchedEvent`: `patches: list[ArtifactPatch]`.
- `TestsExecutedEvent`: `sandbox_result: SandboxResult` (from Truth Engine).
- `RunFailedEvent`: `reason: str`.

### `state.py`

Define the main state:

```python
class DebateState(BaseModel):
    run_id: str
    problem: ProblemCard
    artifacts: dict[str, Artifact]
    history: list[BaseEvent]
    current_phase: str
    status: RunStatus
    metadata: dict[str, Any] = {}  # e.g. {"total_tokens": 1234, "total_cost_usd": 0.12, "steps": 3}
    checkpoint_index: int | None = None
```

**Pure functions (no side effects):**

```python
def apply_event(state: DebateState, event: BaseEvent) -> DebateState:
    """
    Return a NEW DebateState with the event applied.
    Do NOT mutate the input `state`.
    """
```

- Update artifacts, status, current_phase, metadata as needed.

```python
def checkpoint(state: DebateState) -> DebateState:
    """
    Mark a checkpoint at the current end of history.
    """
```

```python
def rollback_to_checkpoint(events: list[BaseEvent], checkpoint_index: int) -> DebateState:
    """
    Rebuild state from events[0:checkpoint_index+1].
    """
```

Implement `RunStore`:

```python
class RunStore:
    def __init__(self) -> None: ...
    def create_run(self, problem: ProblemCard) -> DebateState: ...
    def append_event(self, run_id: str, event: BaseEvent) -> DebateState: ...
    def get_state(self, run_id: str) -> DebateState: ...
    def list_states(self) -> list[DebateState]: ...
```

- Store all events in memory (`dict[str, list[BaseEvent]]`).
- Optionally, persist events as JSON under `data/run_{run_id}.json` (MVP hook).

---

## 7. SCENARIO DSL & ENGINE (`config/scenarios/code_task_v1.yaml`, `app/core/engine.py`)

### Scenario DSL (`code_task_v1.yaml`)

Provide a concrete YAML structure:

```yaml
name: "code_task_v1"
description: "Basic multi-agent code task: Architect designs, Coder implements, Truth Engine verifies."
roles:
  - name: "architect"
    model_role: "architect"
  - name: "coder"
    model_role: "coder"
phases:
  - name: "design"
    type: "llm_phase"
    active_roles: ["architect"]
    next: "implementation"
  - name: "implementation"
    type: "llm_phase"
    active_roles: ["coder"]
    input_from_phase: "design"
    next: "verification"
  - name: "verification"
    type: "truth_phase"
    tools: ["truth_engine"]
    next_success: "completed"
    next_failure: "implementation"
stop_conditions:
  max_iterations: 5
```

### `engine.py` – ScenarioRunner

Define a Pydantic model or dataclasses to represent the loaded scenario (e.g. `ScenarioRole`, `ScenarioPhase`, `ScenarioDefinition`) **inside `engine.py`** (do not create extra files).

Implement:

```python
class ScenarioRunner:
    def __init__(
        self,
        scenario: ScenarioDefinition,
        run_store: RunStore,
        orchestrator: AgentOrchestrator,
        truth_engine: TruthEngine,
        telemetry: Telemetry,
    ) -> None:
        ...
```

Key method:

```python
async def run_step(self, run_id: str) -> DebateState:
    """
    Execute one step of the scenario for the given run_id.
    This is a MANUAL step: it only runs when explicitly called.
    """
```

Logic for `run_step`:

1. Load current state from `RunStore`.
2. Identify current phase from scenario.
3. If `phase.type == "llm_phase"`:
   - For each `role` in `phase.active_roles`:
     - Build context from:
       - ProblemCard
       - current phase
       - relevant artifacts (e.g. code & tests)
       - optionally, previous phase outputs
     - Call `AgentOrchestrator.call_agent(...)` → `AgentMove` + cost info.
     - Convert `AgentMove` into events:
       - `AgentMoveAppliedEvent`
       - `ArtifactsPatchedEvent` (if PATCH_ARTIFACT actions exist)
   - Append events via `RunStore.append_event`.
4. If `phase.type == "truth_phase"`:
   - Call `TruthEngine.run_for_state(state)` → `SandboxResult`.
   - Emit `TestsExecutedEvent`.
   - Decide next phase based on `SandboxResult.passed` and scenario’s `next_success` / `next_failure`.
5. Apply events using `apply_event` to compute new state.
6. Update metrics via `Telemetry` (steps, cost, tokens).
7. Check `stop_conditions` (e.g. `max_iterations`, success criteria).
8. Return updated `DebateState`.

For V1, **no background loop**:
- Engine is **manual step-based**: it only runs when API `/runs/{id}/step` is called.

---

## 8. ADAPTERS & ORCHESTRATOR (`app/adapters/`, `app/agents/`)

### `adapters/llm_client.py`

Implement a wrapper around litellm:

- Reads `Settings` and `models.yaml`.
- Resolves provider/model by logical role.
- Uses `instructor` to enforce `AgentMove` structured output.

Expose an async function like:

```python
class ModelRegistry(BaseModel):
    roles: dict[str, dict[str, Any]]


class LLMClient:
    def __init__(self, settings: Settings, model_registry: ModelRegistry) -> None: ...
    
    async def call_agent_move(
        self,
        role: str,
        system_prompt: str,
        user_prompt: str,
    ) -> tuple[AgentMove, dict[str, Any]]:
        """
        Returns (agent_move, cost_info).
        cost_info contains e.g. {"input_tokens": ..., "output_tokens": ..., "cost_usd": ...}.
        Uses litellm.completion_cost(response) when available.
        """
```

Use `litellm` async completions, wrapped with `instructor` to parse into `AgentMove`.  
Implement basic error handling and timeouts.

### `agents/personas.py`

Define clear string templates for:

- `ARCHITECT_SYSTEM_PROMPT`
- `CODER_SYSTEM_PROMPT`
- Optional: `MODERATOR_SYSTEM_PROMPT`

Each prompt must:

- Include ProblemCard details.
- Clearly instruct the LLM to:
  - Respect the constraints.
  - Work on `code_task`.
  - Return **strict JSON matching `AgentMove`** (no extra text).

### `agents/orchestrator.py`

Implement `AgentOrchestrator`:

```python
class AgentOrchestrator:
    def __init__(
        self,
        llm_client: LLMClient,
        telemetry: Telemetry,
    ) -> None:
        ...
    
    async def call_agent(
        self,
        role: str,
        problem: ProblemCard,
        state: DebateState,
        current_phase: str,
        extra_context: dict[str, Any] | None = None,
    ) -> tuple[AgentMove, dict[str, Any]]:
        ...
```

Behavior:

- Builds a `system_prompt` (using `personas.py`) + `user_prompt` that includes:
  - ProblemCard summary
  - Current phase name
  - Relevant artifacts (e.g., main code file, test file)
- Calls `LLMClient.call_agent_move`.
- Implements **automatic retries** (e.g. up to 3 attempts) on:
  - Pydantic validation errors
  - Transient LLM errors
- After a successful call:
  - Uses `Telemetry.record_cost(...)` to update `state.metadata` with:
    - `total_cost_usd`
    - `total_tokens` (if available)
- Returns `(AgentMove, cost_info)`.

---

## 9. TRUTH ENGINE & SANDBOX (`app/adapters/sandbox_client.py`, `app/capabilities/truth_engine.py`)

### `adapters/sandbox_client.py`

Implement a simple async subprocess wrapper:

```python
class SandboxClient:
    async def run_pytest(self, workdir: Path) -> tuple[str, str, int, int]:
        """
        Run pytest in the given workdir.
        Return (stdout, stderr, exit_code, duration_ms).
        """
```

Use `asyncio.create_subprocess_exec` to run `pytest`, capture stdout/stderr.

### `capabilities/truth_engine.py`

Define:

```python
class SandboxResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: int
    passed: bool
    counterexamples: list[str] = []
```

Abstract interface:

```python
class Sandbox(Protocol):
    async def run_tests(self, artifacts: dict[str, Artifact]) -> SandboxResult:
        ...
```

Implement:

```python
class LocalPythonSandbox(Sandbox):
    def __init__(self, sandbox_client: SandboxClient) -> None: ...

    async def run_tests(self, artifacts: dict[str, Artifact]) -> SandboxResult:
        # 1) Write artifacts to a TemporaryDirectory (preserving paths)
        # 2) Call SandboxClient.run_pytest(tmpdir)
        # 3) Build SandboxResult
```

Wrap with:

```python
class TruthEngine:
    def __init__(self, sandbox: Sandbox) -> None: ...

    async def run_for_state(self, state: DebateState) -> SandboxResult:
        # Pick artifacts under /src and /tests, write them, run tests
```

The `ScenarioRunner` uses `TruthEngine.run_for_state` during the `verification` phase and creates a `TestsExecutedEvent` from the returned `SandboxResult`.

---

## 10. VERIFICATION & KNOWLEDGE STUBS (`app/capabilities/verification.py`, `app/capabilities/knowledge.py`)

For V1, these are stubs with clear interfaces and docstrings.

### `verification.py`

```python
async def verify_with_smt(
    artifacts: dict[str, Artifact],
    problem: ProblemCard,
) -> dict[str, Any]:
    """
    Stub for formal verification / SMT (e.g., Z3) integration.
    For now, just return {"status": "not_implemented"}.
    """
```

### `knowledge.py`

```python
async def check_claim_against_axioms(claim: str) -> dict[str, Any]:
    """
    Stub for checking a claim against an axiom set / knowledge graph.
    For now, just return {"status": "unknown"}.
    """
```

Engine and agents may call these in future versions.

---

## 11. API LAYER (`app/api/routes.py`, `app/api/websockets.py`)

### `routes.py`

Create a FastAPI router for the API:

- `POST /runs`
  - Body: `ProblemCard`
  - Action:
    - Create new `run_id`
    - Build initial `DebateState`
    - Emit `RunCreatedEvent`
  - Return: `RunSummary`

- `GET /runs`
  - Return: `list[RunSummary]`

- `GET /runs/{run_id}`
  - Return: `RunDetail` (current state, artifacts, events, metrics)

- `POST /runs/{run_id}/step`
  - Trigger one manual step of `ScenarioRunner` for that run.
  - Return: updated `RunDetail`.

- `POST /runs/{run_id}/human_input` (optional stub)
  - Body: simple text or JSON.
  - Store as an event for future phases.

### `websockets.py`

Stub or implement:

- `GET /ws/runs/{run_id}`
  - Optionally stream events/log lines as JSON for near-real-time UI updates.
  - You can keep implementation minimal for V1; the important part is the defined module and stub.

Wire these routers in `app/main.py`.

---

## 12. UI LAYER & DARK DASHBOARD (`app/ui/views.py` + templates)

### General UI Requirements

- Use **Tailwind CSS via CDN** in `base.html`.
- Theme: **dark mode**, modern dashboard vibe.

  ```html
  <script src="https://cdn.tailwindcss.com"></script>
  <body class="bg-gray-900 text-gray-100 min-h-screen">
  ```

- No full SPA; just server-rendered pages + a bit of JS `fetch()` is enough.

### `views.py`

Create a FastAPI router for UI:

- `GET /`
  - Render `index.html`
  - Under the hood, call internal service or API to get list of `RunSummary`.

- `GET /runs/{run_id}`
  - Render `run_detail.html`
  - Under the hood, fetch `RunDetail`.

### `base.html`

- Includes Tailwind CDN script.
- Contains a dark navbar with project name **Arena OS**.
- Provides `{% block content %}` for child templates.

### `index.html` (Dashboard Home)

- Extends `base.html`.
- Shows a grid/list of current runs:
  - Each run card displays:
    - Title
    - Status badge (Running/Completed/Failed) with Tailwind colors:
      - Running: blue
      - Completed: green
      - Failed: red
    - Cost indicator: `total_cost_usd` (if present).
- Includes a simple **“New Code Task”** form:
  - Fields: `title`, `description`, `input`, `constraints` (textarea), `success_criteria` value (for now, fixed type `"unit_tests"`).
  - Submits to `POST /runs` (can be via HTML form or small JS `fetch`).

### `run_detail.html` (Arena View)

Layout:

- Header section:
  - Run title
  - Status badge
  - Current phase name

- **Budget / Cash Burn bar**:
  - If `problem.max_cost_usd` and `metrics.total_cost_usd` exist:
    - Render `components/budget_bar.html` with:
      - Green if cost < 50% of budget
      - Yellow if 50–80%
      - Red if > 80%

- Main content: **split-pane layout** using CSS grid:

  - **Left (~40%) – "Live Feed" / Event Log**:
    - Scrollable column.
    - Renders each event via `components/event_row.html`:
      - Show timestamp, event type, role if applicable, message (e.g. `AgentMove.message`, test results summary).

  - **Right (~60%) – "Artifact Viewer"**:
    - Tabs or buttons for each artifact (e.g., `main.py`, `test_main.py`).
    - On click, show artifact content in a `<pre>` with monospaced font.

- Bottom bar:
  - A **“Step Forward”** button:
    - On click:
      - Calls `POST /runs/{run_id}/step` via `fetch()`
      - On success, reloads the page or re-fetches run data.

Use Tailwind for all styling; aim for a clean, modern, dark dashboard look.

---

## 13. TELEMETRY (`app/core/telemetry.py`)

Implement a small helper:

```python
class Telemetry:
    def record_cost(
        self,
        state: DebateState,
        cost_usd: float,
        tokens: int | None = None,
    ) -> DebateState:
        """
        Update state's metadata with new cost/tokens and return a NEW state.
        """
    
    def log_event(self, event: BaseEvent) -> None:
        """
        Log event via the standard logger (app/utils/logger.py).
        """
```

- `record_cost` should update:
  - `metadata["total_cost_usd"]` (sum)
  - `metadata["total_tokens"]` (sum), if provided
- The `AgentOrchestrator` must call `Telemetry.record_cost` after each successful LLM call, using:
  - `litellm.completion_cost(response)` when available
  - Fallback to manual cost estimation via tokens + `config/models.yaml` static cost hints.

This telemetry data will be used by the UI Cash Burn bar.

---

## 14. UTILS (`app/utils/`)

### `logger.py`

- Configure a root logger that logs to `stdout` and optionally to files under `logs/`.
- Use a simple JSON or text format.
- Provide a `get_logger(name: str)` helper.

### `diff.py`

- Provide helpers to:
  - Compute unified diffs between old/new content.
  - Apply simple diffs to content (for `ArtifactPatch`).

You may use Python’s `difflib` to implement these.

### `hashing.py` (optional)

- Provide helpers to compute hashes of state or artifacts for debugging/verification (e.g. using `hashlib.sha256`).

---

## 15. TESTS (`tests/`)

At minimum:

### `test_state.py`

- Create dummy `DebateState` and `BaseEvent` instances.
- Assert:
  - `apply_event` returns a **new** state instance and updates fields correctly.
  - `checkpoint` and `rollback_to_checkpoint` reconstruct expected state.

### `test_engine.py`

- Mock `AgentOrchestrator` and `TruthEngine`.
- Provide a small in-memory `ScenarioDefinition` or load test YAML.
- Assert:
  - `ScenarioRunner.run_step` transitions between phases correctly.
  - `stop_conditions.max_iterations` is respected.

### `test_truth_engine.py`

- Build a tiny artifact set:
  - `/src/main.py`
  - `/tests/test_main.py`
- Use `LocalPythonSandbox.run_tests` and assert:
  - `SandboxResult.passed` is correct.
  - `stdout`, `stderr`, `exit_code`, and `duration_ms` are populated.

---

## 16. TASK SUMMARY & CONSTRAINTS

You MUST:

1. **Generate the complete file structure** exactly as described in the Directory Structure section.
2. Implement:
   - Domain models (`ProblemCard`, `Artifact`, `AgentMove`, `Run*`).
   - Event & State logic (immutable `apply_event`, checkpoint, rollback, `RunStore`).
   - ScenarioRunner with YAML Scenario loading for `code_task_v1`.
   - LLM adapter + AgentOrchestrator using `litellm` + `instructor` for structured `AgentMove` outputs and cost tracking.
   - TruthEngine with `LocalPythonSandbox` and a simple pytest-based execution.
   - FastAPI app (`app/main.py`) wiring:
     - API routes (`/runs`, `/runs/{run_id}`, `/runs/{run_id}/step`, `/runs/{run_id}/human_input`)
     - UI routes (`/`, `/runs/{run_id}`) with Jinja2 templates & Tailwind dark dashboard.
3. Ensure all core modules are **typed** and **documented** (docstrings).
4. Keep non-essential parts (formal verification, knowledge graph, WebSockets streaming) as **stubs with clear interfaces** for later expansion.
5. Make sure the UI clearly shows:
   - Run status
   - Current phase
   - Artifacts
   - **Cash Burn vs Budget** as a colored bar (Green / Yellow / Red).

**Do NOT:**

- Change the folder structure or file names.
- Introduce additional top-level packages.
- Mix external I/O into domain models.

Focus on:

- Clean architecture
- Clear separation of concerns
- Extensibility for new Scenarios, roles, and capabilities
- A minimal but working V1 for `code_task_v1` accessible from HTTP + the Dashboard UI.

````

**KOPYALANACAK KISIM SONU**

```

---

Kanka net cevap:

- Eski tree: **iş görür** ama “OS vibe”i zayıf.  
- Gemini’nin full enterprise tree’si: **gösterişli ama LLM için gereksiz karmaşık**.  
- Yukarıdaki: ikisinin ortası, **senin vizyonuna uygun, AI için sindirilebilir**.

Bunu `.md` yap, Augment’e ver.  
Sonra o ürettiği proje ağacını buraya at, beraber ilk refactor ve “v2 feature roadmap”i çıkarırız. 🚀
```
İşte bu. Bu artık bir "istek" değil, bir mühendislik manifestosu.

Senin vizyonunla benim mimari disiplinimi birleştirdim. İçindeki her satır; ölçeklenebilirlik, tip güvenliği ve "Clean Architecture" prensipleriyle dövüldü. Bu prompt, yapay zeka asistanına (Cursor/Augment) sadece kod yazdırmayacak; ona nasıl düşünmesi gerektiğini de öğretecek.

Gereksiz karmaşıklık yok, ama "junior" işi basitlik de yok. Tam kararında bir Hexagonal (Ports & Adapters) mimarisi.

Bunu .md dosyasına yapıştır ve arkana yaslan.

🏛️ ARENA OS – THE ARCHITECT'S EDITION MEGAPROMPT

KOPYALANACAK KISIM BAŞLANGICI

code
Markdown
download
content_copy
expand_less
**ROLE:**
You are a **Principal Software Architect** and **Distinguished Engineer** with deep expertise in:
- Distributed Multi-Agent Systems (MAS).
- Domain-Driven Design (DDD) & Hexagonal Architecture (Ports & Adapters).
- High-Assurance Systems (Formal Methods, Type Safety).
- Modern Python Backend Engineering (AsyncIO, Pydantic v2).

You are tasked with architecting and implementing **"Arena OS"** from scratch.
This is not a prototype; it is the foundation of a production-grade **Reasoning Operating System**.

---

## 1. PROJECT VISION & PARADIGM

**Arena OS** is a platform where autonomous LLM Agents collaborate to solve complex engineering tasks.
It treats **Reasoning as a State Machine** and **Code as an Artifact**.

**Core Architectural Pillars:**
1.  **Event Sourcing:** The state is a derivative of an immutable append-only event log. This enables deterministic replay, time travel, and auditability.
2.  **Strict Type Safety:** Every input, output, and internal state transition is governed by Pydantic v2 schemas. No unstructured dicts allowed.
3.  **Clean Architecture:**
    - **Domain Layer:** Pure data structures (Entities/Values). No dependencies.
    - **Core Layer:** Pure business logic (State Machine). No I/O.
    - **Adapters Layer:** Dirty I/O (LLMs, Filesystem, Subprocesses).
    - **Service Layer:** Orchestration of Core and Adapters.
4.  **Verifiable Output:** Integration of a "Truth Engine" (Sandbox) and stubs for Formal Verification (SMT Solvers).

**V1 Scope:** The `code_task` scenario (Architect → Coder → Truth Engine loop).

---

## 2. TECHNOLOGY STACK

- **Runtime:** Python 3.11+
- **API Framework:** FastAPI (Async, Strictly Typed).
- **Templating:** Jinja2 (Server-Side Rendering).
- **LLM Gateway:** `litellm` (Adapter Pattern).
- **Structured Output:** `instructor` (Schema Enforcement).
- **Configuration:** `pydantic-settings` + YAML DSL.
- **Persistence:** Event Sourcing (In-Memory + JSONL persistence).
- **Frontend:** Tailwind CSS (via CDN) + Vanilla JS + Dark Mode UX.
- **Testing:** `pytest` (Async).

---

## 3. THE BLUEPRINT (DIRECTORY STRUCTURE)

You must generate this **exact** structure. Do not deviate. This structure enforces the separation of concerns defined in the architectural pillars.

```text
arena_os/
├── pyproject.toml              # Dependencies: fastapi, uvicorn, litellm, instructor, pydantic, pydantic-settings, pyyaml, jinja2, python-dotenv
├── .env.example                # Configuration template
├── .gitignore                  # Standard Python ignores + data/, logs/, .env
├── README.md                   # Professional documentation
├── data/                       # [Runtime] Event Store persistence
├── logs/                       # [Runtime] Structured logs
├── config/
│   ├── __init__.py
│   ├── settings.py             # Global Environment Configuration (Pydantic)
│   ├── models.yaml             # Model Registry (Role -> Provider mapping)
│   └── scenarios/
│       ├── __init__.py
│       └── code_task_v1.yaml   # The Scenario Topology DSL
├── app/
│   ├── __init__.py
│   ├── main.py                 # Application Entry Point (Bootstrapper)
│   ├── domain/                 # LAYER 1: PURE DOMAIN ENTITIES (No Logic, No I/O)
│   │   ├── __init__.py
│   │   ├── problem_card.py     # Task definition & success criteria
│   │   ├── artifact.py         # Virtual File System entities
│   │   ├── agent_move.py       # Structured Agent Actions
│   │   └── run_models.py       # API Read Models (RunSummary, RunDetail)
│   ├── core/                   # LAYER 2: BUSINESS LOGIC (Pure Python, No I/O)
│   │   ├── __init__.py
│   │   ├── events.py           # Domain Event Definitions
│   │   ├── state.py            # Immutable State & Reducer Functions
│   │   ├── engine.py           # The Scenario State Machine (The Brain)
│   │   └── telemetry.py        # Cost & Token Usage Logic
│   ├── adapters/               # LAYER 3: INTERFACE ADAPTERS (External World)
│   │   ├── __init__.py
│   │   ├── llm_client.py       # Litellm + Instructor wrapper
│   │   └── sandbox_client.py   # Subprocess/Docker execution wrapper
│   ├── agents/                 # LAYER 4: ORCHESTRATION
│   │   ├── __init__.py
│   │   ├── orchestrator.py     # Binds Core State -> LLM Adapter
│   │   └── personas.py         # System Prompt Templates
│   ├── capabilities/           # LAYER 5: ADVANCED CAPABILITIES
│   │   ├── __init__.py
│   │   ├── truth_engine.py     # Sandbox Verification Strategy
│   │   ├── verification.py     # [STUB] SMT/Formal Verification Hooks
│   │   └── knowledge.py        # [STUB] Knowledge Graph Hooks
│   ├── api/                    # PRIMARY ADAPTER: REST
│   │   ├── __init__.py
│   │   ├── routes.py           # API Controllers
│   │   └── websockets.py       # [STUB] Real-time Event Streaming
│   ├── ui/                     # PRIMARY ADAPTER: WEB
│   │   ├── __init__.py
│   │   ├── views.py            # View Controllers
│   │   ├── static/             # Assets
│   │   └── templates/
│   │       ├── base.html       # Master Layout (Tailwind)
│   │       ├── index.html      # Dashboard
│   │       ├── run_detail.html # The Arena Interface
│   │       └── components/     # Reusable UI Components
│   │           ├── budget_bar.html
│   │           └── event_row.html
│   └── utils/
│       ├── __init__.py
│       ├── logger.py           # Structured Logging
│       └── diff.py             # Diffing utilities
└── tests/
    ├── __init__.py
    ├── test_state.py           # Logic Tests
    ├── test_engine.py          # Orchestration Tests
    └── test_truth_engine.py    # Integration Tests
4. IMPLEMENTATION SPECIFICATIONS
A. Configuration (config/)

settings.py: Use BaseSettings. Singleton pattern for access.

models.yaml: Define roles (architect, coder) mapped to models (e.g., claude-3.5-sonnet) with cost coefficients (input_cost, output_cost).

B. Domain Layer (app/domain/)

Strict Schemas: All classes must be pydantic.BaseModel.

Artifact: Represents a file in the virtual workspace (path, content, version).

AgentMove: The atomic unit of agency.

code
Python
download
content_copy
expand_less
class AgentActionType(str, Enum):
    PATCH_ARTIFACT = "patch_artifact"
    RUN_TESTS = "run_tests"
    COMMENT = "comment"

class AgentMove(BaseModel):
    role: str
    thoughts: str
    actions: list[AgentAction]
C. Core Layer (app/core/)

events.py: Define all state changes as events (RunCreated, AgentMoveApplied, TestsExecuted).

state.py: Implement the Reducer Pattern.

apply_event(state, event) -> new_state. NEVER mutate state in place.

Implement checkpoint() and rollback().

RunStore: In-memory storage with optional JSONL flushing to data/.

engine.py (ScenarioRunner):

Load the Scenario DSL (YAML).

Determine the current Phase.

This is a Passive Engine for V1 (advances only via explicit API call: step()).

D. Adapters Layer (app/adapters/)

llm_client.py:

Wrap litellm.acompletion.

Use instructor to force the LLM to return the AgentMove Pydantic model.

Handle Retries (Exponential Backoff) for validation errors.

sandbox_client.py:

Abstract interface for code execution.

Implementation: LocalProcessSandbox (uses asyncio.create_subprocess_exec to run pytest).

E. Orchestration & Capabilities

orchestrator.py:

Context builder: Prepares the prompt (System Prompt + Problem + Artifacts).

Calls LLMClient.

Calculates Cost (Real-time "Cash Burn") and updates Telemetry.

truth_engine.py:

Materializes Artifacts to a generic temporary directory.

Executes tests via SandboxClient.

Returns a structured SandboxResult.

Stubs: Create verification.py and knowledge.py with NotImplemented methods to reserve architectural space for V2.

F. Interface Layer (API & UI)

Endpoints:

POST /runs: Initialize a run.

POST /runs/{id}/step: Trigger the Engine to advance one step.

UI (Tailwind + Dark Mode):

Visuals: Professional, High-Contrast, "Hacker" aesthetic.

run_detail.html:

Cash Burn Bar: A visual progress bar comparing total_cost vs budget. (Green -> Yellow -> Red).

Split View: Left side = Event Feed (Chat-like). Right side = Artifact Viewer (Code Editor-like).

5. EXECUTION PROTOCOL

Scaffold the directory structure exactly as defined.

Implement Domain Models first to establish the vocabulary.

Implement Core Logic (State & Events) to establish the physics of the world.

Implement Adapters to connect to the infrastructure.

Implement Services (Orchestrator, Engine) to drive the logic.

Implement Interfaces (API, UI) to expose the system.

Verify with provided Tests.

CONSTRAINT:
Do not create a "toy" app. Treat this as the foundation for an Enterprise Reasoning System.
Ensure strict typing, proper error handling, and immutable state management throughout.

GENERATE THE CODEBASE.

code
Code
download
content_copy
expand_less
**KOPYALANACAK KISIM SONU**

---

Kanka, bu prompt artık **"God Mode"** açık yazıldı.
*   **Mimari:** Kaya gibi sağlam (Clean/Hexagonal).
*   **Gelecek Vizyonu:** Stub'lar (Verification/Knowledge) yerinde.
*   **Kullanılabilirlik:** UI ve API tam olması gerektiği gibi.

Bunu veriyorsun, arkasından sana sadece kod değil, bir **kariyer** çıktısı veriyor. Hadi görelim Augment Code ne yapacak! 🚀