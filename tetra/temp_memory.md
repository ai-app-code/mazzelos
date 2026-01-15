# Arena OS - Kapsamli Proje Hafizasi

**Son Guncelleme:** 2025-12-04
**Analiz Tarihi:** Kapsamli kod tabani incelemesi yapildi

---

## Proje Ozeti

| Ozellik | Deger |
|---------|-------|
| **Proje Adi** | Arena OS V1 |
| **Tur** | Multi-Agent Reasoning & Engineering Operating System |
| **Ana Dil** | Python 3.11+ |
| **Framework** | FastAPI + Jinja2 |
| **LLM Entegrasyonu** | litellm + instructor |
| **UI Stili** | Tailwind CSS (CDN), Dark Theme |
| **Senaryo Tipi** | code_task_v1 (Mevcut) |
| **Durum** | Calisir durumda |

---

## Proje Yapisi ve Mimari

```
debate/
├── main.py                    # Ana FastAPI uygulamasi
├── requirements.txt           # Python bagimliliklari
├── roadmap.md                 # Detayli proje yol haritasi
├── README.md                  # Kurulum ve kullanim kilavuzu
├── app/                       # Ana uygulama kodu
│   ├── core/                  # Is mantigi ve event sourcing
│   │   ├── engine.py          # ScenarioRunner - ana motor
│   │   ├── event_sourcing.py  # Event sourcing mantigi
│   │   ├── run_store.py       # InMemoryRunStore
│   │   └── telemetry.py       # Maliyet ve token takibi
│   ├── domain/                # Pydantic modelleri
│   │   ├── problem_card.py    # ProblemCard, RoleModelConfig, CreateRunRequest
│   │   ├── artifact.py        # Artifact, ArtifactPatch
│   │   ├── agent_move.py      # AgentMove, AgentAction, AgentActionType
│   │   ├── events.py          # BaseEvent, RunCreatedEvent, vb.
│   │   ├── state.py           # DebateState, RunStore protokolu
│   │   └── run.py             # RunStatus, RunSummary, RunDetail
│   ├── agents/                # LLM ajanlari
│   │   ├── orchestrator.py    # AgentOrchestrator - LLM koordinasyonu
│   │   ├── model_registry.py  # ModelRegistry - model konfigurasyonu
│   │   └── personas.py        # Sistem promptlari
│   ├── capabilities/          # Yetenekler
│   │   ├── truth_engine.py    # TruthEngine - test calistirma
│   │   ├── sandbox.py         # Sandbox arayuzu
│   │   ├── local_sandbox.py   # LocalPythonSandbox
│   │   ├── verification.py    # [STUB] Formal dogrulama
│   │   └── knowledge.py       # [STUB] Bilgi grafigi
│   ├── adapters/              # Dis dunya adaptorleri
│   │   ├── llm_client.py      # LLMClient - litellm + instructor
│   │   ├── sandbox_client.py  # SandboxClient
│   │   └── storage.py         # FileStorage
│   ├── api/                   # REST API
│   │   ├── routes.py          # API endpointleri
│   │   ├── deps.py            # Dependency injection
│   │   └── websocket.py       # WebSocket (gelecek)
│   └── ui/                    # Web arayuzu
│       ├── views.py           # Jinja2 view fonksiyonlari
│       └── templates/
│           ├── base.html      # Ana sablon (sidebar, header)
│           ├── index.html     # Dashboard (metrikler)
│           ├── arena.html     # Oturum listesi
│           ├── run_detail.html # Oturum detay sayfasi
│           ├── setup.html     # Yeni oturum kurulumu
│           ├── model_pool.html # Model havuzu yonetimi
│           └── api_keys.html  # API anahtarlari yonetimi
├── config/
│   ├── settings.py            # Settings sinifi (pydantic-settings)
│   ├── models.yaml            # Rol -> Model eslesmeleri
│   └── scenarios/
│       └── code_task_v1.yaml  # Senaryo tanimi
├── tests/
│   ├── conftest.py            # Pytest fixtures
│   ├── test_api.py
│   ├── test_domain.py
│   └── test_engine.py
└── data/                      # Calisma zamani verileri
```

---

## Kullanilan Teknolojiler

### Backend
| Teknoloji | Versiyon | Aciklama |
|-----------|----------|----------|
| Python | 3.11+ | Ana programlama dili |
| FastAPI | >=0.104.0 | Web framework |
| Uvicorn | >=0.24.0 | ASGI sunucusu |
| Pydantic | >=2.5.0 | Veri dogrulama |
| pydantic-settings | >=2.1.0 | Ayar yonetimi |
| litellm | >=1.17.0 | LLM saglayici soyutlamasi |
| instructor | >=0.4.0 | Yapilandirilmis LLM ciktilari |
| Jinja2 | >=3.1.2 | Template engine |
| PyYAML | >=6.0.1 | YAML parsing |
| python-dotenv | >=1.0.0 | .env dosyasi okuma |

### Frontend
| Teknoloji | Kaynak | Aciklama |
|-----------|--------|----------|
| Tailwind CSS | CDN | CSS framework |
| Chart.js | CDN | Grafikler |
| Vanilla JavaScript | Inline | Etkilesim |

### Test
| Teknoloji | Aciklama |
|-----------|----------|
| pytest | Test framework |
| pytest-asyncio | Async test destegi |
| httpx | FastAPI TestClient |

---

## API Endpointleri

### REST API (/api)
| Method | Path | Aciklama |
|--------|------|----------|
| POST | /api/runs | Yeni run olustur |
| GET | /api/runs | Tum runlari listele |
| GET | /api/runs/{run_id} | Run detaylari |
| POST | /api/runs/{run_id}/step | Bir adim ilerle |
| POST | /api/runs/{run_id}/human_input | [STUB] Insan girisi |

### UI Routes
| Path | Aciklama |
|------|----------|
| / | Dashboard - metrikler, grafikler |
| /arena | Oturum listesi |
| /runs/{run_id} | Oturum detay (Arena gorunumu) |
| /setup | Yeni oturum kurulumu |
| /model-pool | Model havuzu yonetimi |
| /api-keys | API anahtarlari |
| /docs | Swagger API dokumantasyonu |


---

## Yapilandirma Dosyalari

### config/settings.py
```python
class Settings(BaseSettings):
    openrouter_api_key: Optional[str]    # OpenRouter API key
    openai_api_key: Optional[str]        # OpenAI API key
    anthropic_api_key: Optional[str]     # Anthropic API key
    google_api_key: Optional[str]        # Google API key
    default_scenario: str = "code_task_v1"
    model_config_path: Path = Path("config/models.yaml")
    scenario_dir: Path = Path("config/scenarios")
    log_level: str = "INFO"
    data_dir: Path = Path("data")
    max_iterations_per_phase: int = 10
    default_max_cost_usd: float = 10.0
    sandbox_timeout_seconds: int = 60
```

### config/models.yaml
```yaml
roles:
  architect:
    provider: "openrouter"
    model: "anthropic/claude-3.5-sonnet"
  coder:
    provider: "openrouter"
    model: "anthropic/claude-3.5-sonnet"
  moderator:
    provider: "openrouter"
    model: "anthropic/claude-3.5-sonnet"

settings:
  default_temperature: 0.7
  default_max_tokens: 4096
  max_retries: 3
  timeout_seconds: 120
```

### config/scenarios/code_task_v1.yaml
- **Fazlar:** design -> implementation -> verification
- **Roller:** architect, coder (truth_engine implicit)
- **Faz Tipleri:** llm_phase, truth_phase

---

## UI Ozellikleri

### Mevcut Ozellikler

1. **Dashboard (index.html)**
   - Toplam harcama karti
   - Token sayisi
   - Oturum sayisi
   - Maliyet grafigi (Chart.js)
   - Provider dagilim grafigi

2. **Model Havuzu (model_pool.html)**
   - OpenRouter'dan model katalogu cekme
   - localStorage'da havuz saklama
   - Model arama ve filtreleme
   - Havuza ekleme/cikarma

3. **Kurulum (setup.html)**
   - Oturum konusu (baslik, aciklama, kisitlamalar)
   - Tur limiti, butce, sure ayarlari
   - Calisma modu (Otomatik/Yari-Oto/Manuel)
   - Moderator ve katilimci yonetimi
   - Her rol icin model secimi (dropdown)
   - Ozel sistem promptu duzenleme

4. **API Anahtarlari (api_keys.html)**
   - OpenAI, Anthropic, Google, OpenRouter key yonetimi
   - localStorage'da saklama
   - Varsayilan OpenRouter key

5. **Run Detail (run_detail.html)**
   - Munazara gorunumu
   - Butce bari
   - Step butonlari
   - God Mode mudahale

---

## Model Override Sistemi

### CreateRunRequest
```python
class RoleModelConfig(BaseModel):
    role_name: str       # "architect", "coder", vb.
    provider: str        # "openrouter", "openai", vb.
    model_id: str        # "anthropic/claude-3.5-sonnet"
    temperature: Optional[float]
    max_tokens: Optional[int]
```

### Kullanim
```json
POST /api/runs
{
  "problem": { ... },
  "model_overrides": {
    "architect": {
      "role_name": "architect",
      "provider": "openrouter",
      "model_id": "openai/gpt-4o"
    },
    "coder": {
      "role_name": "coder",
      "provider": "openrouter",
      "model_id": "anthropic/claude-3.5-sonnet"
    }
  }
}
```

### Orchestrator Isleyisi
`app/agents/orchestrator.py` satir 88-119:
- `state.metadata.get("model_overrides", {})` kontrol edilir
- Override varsa, o model kullanilir
- Yoksa `models.yaml`'dan varsayilan alinir

---

## Kurulum ve Calistirma

### Bagimliliklar
```bash
pip install -r requirements.txt
```

### Yapilandirma
1. `.env` dosyasi olustur (opsiyonel)
2. API anahtarlarini `/api-keys` sayfasindan ayarla
3. Model havuzunu `/model-pool` sayfasindan doldur

### Baslatma
```bash
python main.py
# veya
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Erisim
- **Ana Sayfa:** http://localhost:8000
- **Swagger:** http://localhost:8000/docs
- **Health:** http://localhost:8000/health

---

## Kullanici Gereksinimleri (Hafiza)

Kullanicinin daha once belirttigi gereksinimler:

1. **Dinamik Model Secimi UI** - Her calistirma icin farkli LLM secimi (Architect, Coder vb. rolleri icin dropdown)
2. **Turkce Arayuz** - UI tamamen Turkce
3. **UI'dan API Key Yonetimi** - Kullanici arayuzunden API anahtari ekleme/duzenleme
4. **Profesyonel Dark Theme** - Modern, karanlik tema tasarimi (basit formlar degil)

---

## Mevcut Durumda Desteklenenler

**Calisan Ozellikler:**
- FastAPI + Jinja2 web uygulamasi
- Dark theme UI (Tailwind CSS)
- Model havuzu yonetimi (localStorage)
- API key yonetimi (localStorage)
- Oturum kurulumu (setup.html)
- Model secimi dropdownlari
- Run olusturma API'si
- Model override destegi (backend)
- Turkce UI metinleri

**Kismen Calisan:**
- LLM cagrilari (API key gerektirir)
- Run step calistirma

---

## Notlar

- OpenRouter varsayilan key kodda gomulu (degistirilebilir)
- Model havuzu ve API keyler localStorage'da saklaniyor
- Server-side API key dogrulamasi yapilmiyor (guvenlik acigi)
- WebSocket henuz implement edilmedi

---

*Bu dosya, yeni oturum baslatildiginda baglami hizlica geri yuklemek icin referans olarak kullanilacaktir.*
