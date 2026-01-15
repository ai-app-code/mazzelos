# Arena OS Roadmap Özeti

Bu dosya, `roadmap.md` içindeki tüm MEGAPROMPT varyantlarını ve mimari tartışmaları tek, tutarlı bir mimari ve ürün vizyonu halinde özetler. Amaç: V1 Arena OS için net hedefler, mimari prensipler ve teknik çerçeveyi kaybetmeden kısa bir referans sunmak.

## 1. Proje Vizyonu ve Amaç

- **Arena OS**, bir **Multi-Agent Reasoning & Engineering Operating System**.
- Basit bir chat uygulaması değil; birden çok LLM **Agent** (Architect, Coder, Moderator vb.) karmaşık problemleri birlikte çözüyor.
- Çözülen problem tipleri: kodlama, matematik, sistem tasarımı, araştırma, tartışma/debate vb.
- V1 odak senaryo: **`code_task`** – girdi olarak bir kodlama problemi + kısıtlar, çıktı olarak çalışan çözüm dosyası ve geçen unit testler.

## 2. Çekirdek Kavramlar

- **Shared Canvas / Artifacts**: Sanal dosya sistemi; kaynak kod, test dosyaları, dokümanlar `Artifact` modelleri olarak tutulur.
- **Truth Engine (Sandbox)**: Kodun/testlerin izole bir ortamda (`LocalPythonSandbox`) çalıştırıldığı, sonucu raporlayan katman.
- **Scenario Topology (YAML DSL)**: `config/scenarios/code_task_v1.yaml` ile fazlar, roller ve geçişler tanımlanır (design → implementation → verification).
- **Problem Card**: Görev tipi, açıklama, kısıtlar, başarı kriteri ve zaman/maliyet bütçesini tanımlayan domain modeli.
- **Event Sourcing & DebateState**: Tüm ilerleme, `BaseEvent` ve türevleri ile event log’a eklenir; immutable `DebateState` bu event’lerin replay’i ile üretilir.
- **Telemetry & Cost Tracking**: LLM çağrıları ve sandbox çalıştırmaları için token/kost metriği tutulur; UI’de **Cash Burn vs Budget** olarak gösterilir.

## 3. Mimari İlkeler

- **Zero-Error Robustness**: LLM çıktıları Pydantic v2 şemalarıyla zorunlu şemaya oturtulur, hata olursa otomatik retry.
- **Deterministic Replay / Time Travel**: Append-only event log + checkpoint / rollback desteği.
- **Type-Safety**: Tüm Python kodu type hint’li ve anlamlı docstring’lere sahip.
- **Clean / Hexagonal Architecture**: Core/domain, adapters, services/capabilities ve API/UI net katmanlara ayrılmış.
- **Extensibility**: Yeni senaryolar, roller, modeller, araçlar eklenirken çekirdek engine’e minimum dokunuş.
- **Manual, Step-based Engine**: Engine arka planda dönen bir worker değil; yalnızca `/runs/{id}/step` endpoint’i çağrıldığında bir adım ilerler.

## 4. Teknik Yığın

- **Dil**: Python 3.11+
- **Web Framework**: FastAPI (REST + Jinja2 tabanlı SSR UI)
- **Şablonlar**: Jinja2
- **UI**: Tailwind CSS (CDN üzerinden) + vanilla JS (`fetch`), single-page framework (React/Vue/HTMX vb.) yok.
- **LLM**: `litellm` (OpenRouter vb. için soyutlama) + `instructor` (structured output). Modeller `config/models.yaml` ile rol → model eşlemesi.
- **Konfigürasyon**: `pydantic_settings.BaseSettings` + `.env` + YAML (`pyyaml`). API anahtarları sadece `.env` üzerinden.
- **Sandbox**: MVP’de local Python/pytest çalıştıran `subprocess`/`asyncio.create_subprocess_exec`; ileride Docker/E2B adapter’ları için arayüz hazır.
- **Kalıcı veri**: Çoğunlukla in-memory; event log’lar opsiyonel olarak `data/` altında JSON/JSONL olarak saklanır.
- **Logging**: Python `logging` + `app/utils/logger.py` içerisinde standartlaştırılmış logger.
- **Test**: `pytest` + özel unit test dosyaları.

## 5. Dizin Yapısı ve Katmanlar (Özet)

Kök seviye:
- `pyproject.toml`: fastapi, uvicorn, litellm, instructor, pydantic, pydantic-settings, pyyaml, jinja2, python-dotenv, pytest vb.
- `.env.example`, `.gitignore`, `README.md`, `data/`, `logs/`, `config/`, `app/`, `tests/`.

`config/`:
- `settings.py`: `.env`’den okuyan `Settings` + `get_settings()` helper.
- `models.yaml`: architect/coder/moderator gibi roller için provider/model ve opsiyonel cost metadata.
- `scenarios/code_task_v1.yaml`: `design` → `implementation` → `verification` fazları, roller ve stop_conditions (ör. `max_iterations`).

`app/` ana katmanları (en güncel “Nihai” versiyonlara göre):
- `core/`: Engine, state yönetimi, telemetry (saf iş mantığı, event sourcing, faz geçişleri).
- `domain/`: Pydantic şemalar (`problem_card`, `artifact`, `agent_move`, `run`), domain event modelleri.
- `agents/`: LLM orchestrator ve persona/system prompt tanımları.
- `capabilities/`: Truth Engine ve ileri seviye yetenek stubları (`verification`, `knowledge`).
- `adapters/`: LLM client, sandbox client, filesystem veya event-store gibi dış dünya adapter’ları.
- `api/`: REST endpoint’leri + opsiyonel WebSocket/SSE stub’ları.
- `ui/`: Jinja2 view’lar, Tailwind ile dark dashboard HTML şablonları.
- `utils/`: logging, diff, hashing vb. yardımcılar.

`tests/`:
- V1 için en az: `test_state.py`, `test_engine.py`, `test_truth_engine.py` (+ bazı sürümlerde ek sandbox veya entegrasyon test klasörleri).

## 6. Temel Domain Modelleri

- **ProblemCard**:
  - `task_type`: `"code_task" | "math_proof" | "system_design" | "debate"` (V1’de default `code_task`).
  - `title`, `description`, `input`, `constraints: list[str]`.
  - `success_criteria: SuccessCriteria` (tip: `unit_tests` / `property_based` / `rubric`, value: koşul ifadesi).
  - `time_budget_minutes`, `max_cost_usd` (opsiyonel).
- **Artifact**:
  - `path`, `content`, `version`.
  - `ArtifactPatch`: path + unified diff + açıklama.
- **AgentMove / AgentAction**:
  - `AgentActionType`: `PATCH_ARTIFACT`, `RUN_TESTS`, `COMMENT`.
  - `AgentAction`: `type` + serbest `payload` (ör. diff bilgisi).
  - `AgentMove`: `role`, `thoughts`, `message`, `actions`, `confidence ∈ [0,1]`.
- **Run modelleri** (`run.py`):
  - `RunStatus`: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`.
  - `RunSummary`: run listesi için hafif görünüm.
  - `RunDetail`: problem, artefaktlar, event listesi, metrikler vb. detaylı görünüm.
- **Event modelleri** (`events.py`):
  - `BaseEvent`: `event_id`, `run_id`, `timestamp`, `event_type`.
  - Uzantılar: `RunCreatedEvent`, `PhaseStartedEvent`, `AgentMoveAppliedEvent`, `ArtifactsPatchedEvent`, `TestsExecutedEvent`, `RunCompletedEvent`, `RunFailedEvent` vb.
- **DebateState** (`state.py`):
  - `run_id`, `problem`, `artifacts: dict[path, Artifact]`, `history: list[BaseEvent]`, `current_phase`, `status`, `metadata`, `checkpoint_index`.

## 7. Engine & Senaryo Çalışma Şekli

- `ScenarioRunner` (`core/engine.py`):
  - YAML’dan okunmuş bir `ScenarioDefinition` ile çalışır.
  - `run_step(run_id)` çağrıldığında:
    - Mevcut state’i `RunStore` üzerinden alır.
    - Aktif fazı (`design` / `implementation` / `verification`) bulur.
    - Faz tipine göre ya LLM orchestrator’ı (llm_phase) ya da Truth Engine’i (truth_phase) çağırır.
    - Üretilen action’ları event’lere çevirir, `apply_event` ile yeni state üretir, store’a yazar.
    - Stop koşullarını (ör. `max_iterations`) ve başarı kriterlerini kontrol eder.
- Engine **arka plan worker’ı değil**, tamamen HTTP üzerinden manuel adımlarla çalışır.

## 8. LLM Orchestrator & Model Kataloğu

- `config/models.yaml` ile roller (`architect`, `coder`, `moderator`) → provider+model eşlemesi + statik cost ipuçları tanımlanır.
- `AgentOrchestrator`:
  - `Settings` + model registry + `litellm` client ile başlatılır.
  - Problem özeti, mevcut faz, ilgili artifact içerikleri ve kısıtlar ile prompt oluşturur.
  - `instructor` ile `AgentMove` şemasını zorunlu kılar; Pydantic validation hatalarında otomatik retry.
  - `litellm.completion_cost` veya token+statik fiyat bilgisi ile maliyet hesaplar.
  - Telemetry’ye cost/tokens bilgisini iletir ve state.metadata güncellenir.
- `personas.py`: Architect/Coder/Moderator için sistem prompt şablonları; ProblemCard’ı ve kuralları embed eder.

## 9. Truth Engine, Doğrulama ve Knowledge Stubları

- **SandboxResult**: stdout, stderr, exit_code, duration_ms, passed, counterexamples.
- **Sandbox arayüzü**: `run_tests(artifacts)` imzasına sahip `Protocol`.
- **LocalPythonSandbox**:
  - Artifact’ları geçici bir dizine yazar.
  - pytest veya özel test komutunu async subprocess ile çalıştırır.
  - Sonucu `SandboxResult` olarak döner.
- **TruthEngine**:
  - State’ten ilgili dosyaları alır, sandbox’a delege eder, sonucu event’e dönüştürür.
- **Stublar (gelecek V2+ için hazır)**:
  - `verification.py`: `verify_with_smt(...) → {"status": "not_implemented"}`.
  - `knowledge.py`: `check_claim_against_axioms(...) → {"status": "unknown"}`.

## 10. API ve UI Katmanı

- **API (`api/routes.py`)**:
  - `POST /runs`: Body = `ProblemCard`; yeni run yaratır, `RunCreatedEvent` üretir, `RunSummary` döner.
  - `GET /runs`: Tüm run’ların listesi (`list[RunSummary]`).
  - `GET /runs/{run_id}`: Tek run için `RunDetail`.
  - `POST /runs/{run_id}/step`: Bir engine adımı çalıştırır, güncel `RunDetail` döner.
  - `POST /runs/{run_id}/human_input` (opsiyonel stub): İnsan girdisini event olarak kaydeder.
- **WebSocket/SSE (stub)**:
  - `GET /ws/runs/{run_id}`: V1’de basit/boş bırakılabilir, ileride event streaming için hazır.
- **UI (`ui/views.py` + templates)**:
  - `GET /` → `index.html`: Run kartları listesi, durum badge’leri, toplam maliyet gösterimi, “New Code Task” formu.
  - `GET /runs/{run_id}` → `run_detail.html`: Arena görünümü.
  - Dark mode Tailwind theme; grid ile iki kolon:
    - Sol: Event log (Agent mesajları, test sonuçları).
    - Sağ: Artifact viewer (kod ve test dosyalarını sekmelerle gösterir).
  - Alt kısımda “Step Forward” butonu: `/runs/{run_id}/step` çağırır.
  - Üstte **Cash Burn / Budget bar**: `max_cost_usd` ve toplanan `total_cost_usd`’a göre renklendirilir.

## 11. Telemetry ve Maliyet Takibi

- `Telemetry` sınıfı:
  - `record_cost(state, cost_usd, tokens) -> DebateState`: `state.metadata` içindeki `total_cost_usd` ve `total_tokens`’ı günceller.
  - `log_event(event)`: logging veya dosya log’ları ile entegre.
- Orchestrator her LLM çağrısından sonra Telemetry’yi çağırmak zorunda; bu veri UI’de Cash Burn bar’ını besler.

## 12. Test Stratejisi

- **test_state.py**: Event’lerin doğru state değişimi üretip üretmediği, checkpoint/rollback davranışının tutarlılığı.
- **test_engine.py**: Fake scenario + mock orchestrator/truth_engine ile faz geçişleri ve `max_iterations` kontrolü.
- **test_truth_engine.py**: Basit bir Python dosyası + test seti ile LocalPythonSandbox’ın `SandboxResult` alanlarını doğru doldurduğu.
- Bazı sürümlerde ek olarak sandbox/test_sandbox veya entegrasyon testleri öngörülüyor.

## 13. Model İçin Sert Kısıtlar (MEGAPROMPT Tarafı)

- AI kod jeneratörü için mimari **sabit**: klasörleri yeniden adlandırmak, birleştirmek, yeni top-level framework/ORM eklemek **yasak**.
- Tech stack sabit: FastAPI + Jinja2 + Tailwind + litellm + instructor + Pydantic v2; ek web framework, ORM, worker vb. yok.
- Güvenlik: API key’ler sadece `.env` + `config/settings.py` üzerinden; `.env`, `data/`, `logs/`, `__pycache__/` vb. `.gitignore` ile korunur.
- Kapsam disiplini: Prompt dışında “nice to have” özellik veya yeni paket eklemek yok; sadece tanımlanan V1 kapsamı.

Bu özet, `roadmap.md` içindeki tüm ara sürümler (flat tree, enterprise tree, ultimate megapropt, final prompt vb.) arasındaki ortak kararı temsil eder: **V1 Arena OS**, tek bir `code_task` senaryosu için çok etkenli, event-sourced, maliyet-izlemeli ve dark dashboard UI’li bir reasoning operating system çekirdeğidir.
