# Arena OS - V1

**Multi-Agent Reasoning & Engineering Operating System**

## Overview

Arena OS is not a simple chat application. It's an operating system where multiple LLM agents (Architect, Coder, Moderator, etc.) collaborate to solve complex problems in coding, mathematics, system design, and research.

**V1 Scope:** `code_task` scenario - takes a coding problem with constraints as input, produces working solution files and passing unit tests as output.

## Core Concepts

- **Shared Canvas / Artifacts**: Virtual file system for code, tests, and documents
- **Truth Engine (Sandbox)**: Isolated environment for running code and tests
- **Scenario Topology (YAML DSL)**: Defines phases, roles, and transitions (design → implementation → verification)
- **Problem Card**: Task definition with constraints, success criteria, and budget
- **Event Sourcing & DebateState**: All progress tracked via immutable event log
- **Telemetry & Cost Tracking**: Token/cost metrics displayed as Cash Burn vs Budget in UI

## Architecture Principles

- **Zero-Error Robustness**: LLM outputs enforced via Pydantic v2 schemas
- **Deterministic Replay / Time Travel**: Append-only event log + checkpoint/rollback
- **Type-Safety**: Full type hints and meaningful docstrings
- **Clean / Hexagonal Architecture**: Clear separation of core/domain, adapters, services, API/UI
- **Manual, Step-based Engine**: Engine only advances when `/runs/{id}/step` endpoint is called

## Tech Stack

- Python 3.11+
- FastAPI (REST + Jinja2 SSR)
- Tailwind CSS (CDN) + vanilla JS
- litellm + instructor (structured LLM output)
- Pydantic v2 + pydantic-settings
- pyyaml (config/scenarios)
- pytest (testing)

## Project Structure

```
app/
├── core/          # Event sourcing, engine, telemetry
├── domain/        # Pydantic models (ProblemCard, Artifact, Events, State)
├── agents/        # LLM orchestrator, personas
├── capabilities/  # Truth Engine, verification/knowledge stubs
├── adapters/      # LLM client, sandbox client
├── api/           # FastAPI routes
├── ui/            # Jinja2 views & templates
└── utils/         # Logger, diff, helpers

config/
├── settings.py    # Settings (BaseSettings + .env)
├── models.yaml    # Role → model mapping
└── scenarios/     # YAML scenario definitions

tests/             # Unit & integration tests
```

## Getting Started

### Prerequisites

- Python 3.11 or higher
- pip (Python package manager)
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd debate
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Linux/macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env and add your API keys
   # Required: OPENROUTER_API_KEY or other LLM provider keys
   ```

5. **Verify configuration:**
   ```bash
   # Check that config files exist
   ls config/settings.py
   ls config/models.yaml
   ls config/scenarios/code_task_v1.yaml
   ```

### Running the Application

1. **Start the FastAPI server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Access the application:**
   - **Web UI**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs (Swagger UI)
   - **Alternative API Docs**: http://localhost:8000/redoc (ReDoc)

### Usage

#### Creating a Run via Web UI

1. Navigate to http://localhost:8000
2. Click "New Run" button
3. Fill in the problem details:
   - Title: Brief description of the task
   - Description: Detailed problem statement
   - Input: Sample input or test cases
   - Constraints: Requirements (e.g., "Use Python 3.11+", "Include type hints")
   - Time Budget: Maximum time in minutes
   - Max Cost: Maximum cost in USD
4. Click "Create Run"
5. You'll be redirected to the Arena view

#### Stepping Through a Run

1. In the Arena view, click "Step Forward" button
2. The engine will execute one step (agent turn or phase transition)
3. Watch the event log update in real-time
4. View artifacts (code files) in the Artifacts panel
5. Monitor Cash Burn vs Budget in the progress bar

#### Using the API

**Create a run:**
```bash
curl -X POST http://localhost:8000/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "code_task",
    "title": "Implement Binary Search",
    "description": "Write a binary search function",
    "input": "Array: [1,2,3,4,5], Target: 3",
    "constraints": ["Use Python 3.11+", "Include type hints"],
    "success_criteria": {"type": "unit_tests", "value": "All tests must pass"},
    "time_budget_minutes": 30,
    "max_cost_usd": 1.0
  }'
```

**List all runs:**
```bash
curl http://localhost:8000/api/runs
```

**Get run details:**
```bash
curl http://localhost:8000/api/runs/{run_id}
```

**Step a run forward:**
```bash
curl -X POST http://localhost:8000/api/runs/{run_id}/step
```

### Running Tests

**Run all tests:**
```bash
pytest
```

**Run with coverage:**
```bash
pytest --cov=app --cov-report=html
```

**Run specific test file:**
```bash
pytest tests/test_domain.py
pytest tests/test_engine.py
pytest tests/test_api.py
```

**Run with verbose output:**
```bash
pytest -v
```

**Run async tests:**
```bash
pytest -v tests/test_engine.py::TestScenarioRunner::test_run_step_starts_first_phase
```

### Development

**Project follows Clean/Hexagonal Architecture:**

- **Domain Layer** (`app/domain/`): Pure Pydantic models, no external dependencies
- **Core Layer** (`app/core/`): Business logic, event sourcing, engine
- **Adapters** (`app/adapters/`): External integrations (LLM, sandbox, storage)
- **Capabilities** (`app/capabilities/`): Truth Engine, verification, knowledge
- **API Layer** (`app/api/`): FastAPI routes, dependency injection
- **UI Layer** (`app/ui/`): Jinja2 templates, view functions
- **Utils** (`app/utils/`): Logging, diff, helpers

**Key Design Patterns:**

- Event Sourcing: All state changes via immutable events
- Dependency Injection: Singleton pattern with `@lru_cache`
- Repository Pattern: `RunStore` for state persistence
- Strategy Pattern: Pluggable LLM providers and sandbox implementations

### Configuration

**Environment Variables** (`.env`):
```env
# LLM Provider
OPENROUTER_API_KEY=your_key_here
DEFAULT_MODEL=openai/gpt-4

# Application
LOG_LEVEL=INFO
DEBUG=false

# Paths
DATA_DIR=data
LOGS_DIR=logs
```

**Model Configuration** (`config/models.yaml`):
```yaml
models:
  architect: openai/gpt-4
  coder: openai/gpt-4
  moderator: openai/gpt-3.5-turbo
```

**Scenario Configuration** (`config/scenarios/code_task_v1.yaml`):
- Defines phases (design, implementation, verification)
- Role assignments per phase
- Transition conditions

### Troubleshooting

**Issue: Import errors**
- Solution: Ensure virtual environment is activated and dependencies are installed

**Issue: API key errors**
- Solution: Check `.env` file exists and contains valid API keys

**Issue: Tests failing**
- Solution: Run `pytest -v` to see detailed error messages
- Check that all fixtures are properly defined in `tests/conftest.py`

**Issue: Server won't start**
- Solution: Check port 8000 is not already in use
- Try: `uvicorn main:app --port 8001`

### API Documentation

Full API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

**Main Endpoints:**

- `GET /` - Web UI home page
- `GET /health` - Health check
- `GET /api` - API root
- `POST /api/runs` - Create new run
- `GET /api/runs` - List all runs
- `GET /api/runs/{run_id}` - Get run details
- `POST /api/runs/{run_id}/step` - Step run forward
- `POST /api/runs/{run_id}/human_input` - Submit human input (V1 stub)
- `WS /ws/runs/{run_id}` - WebSocket for real-time updates (V1 stub)

### Contributing

(Guidelines to be added)

## License

(To be determined)
