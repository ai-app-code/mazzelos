/**
 * TETRA AI Debate Protocol - Backend Server
 * Tüm veriler JSON dosyalarında saklanır
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Data dosyaları yolu (env destekli)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// Yardımcı fonksiyonlar
const readData = (filename) => {
  const filepath = path.join(DATA_DIR, filename);
  try {
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`[READ ERROR] ${filename}:`, err.message);
    return null;
  }
};

const writeData = (filename, data) => {
  const filepath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`[WRITE ERROR] ${filename}:`, err.message);
    return false;
  }
};

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'TETRA Backend', version: '1.0.0' });
});

// --- API KEYS ---
app.get('/api/keys', (req, res) => {
  const keys = readData('keys.json') || {};
  res.json(keys);
});

app.post('/api/keys', (req, res) => {
  const keys = req.body;
  if (writeData('keys.json', keys)) {
    res.json({ success: true, message: 'API anahtarları kaydedildi' });
  } else {
    res.status(500).json({ success: false, message: 'Kayıt hatası' });
  }
});

// --- MODEL POOL ---
app.get('/api/pool', (req, res) => {
  const pool = readData('pool.json') || [];
  res.json(pool);
});

app.post('/api/pool', (req, res) => {
  const pool = req.body;
  if (writeData('pool.json', pool)) {
    res.json({ success: true, message: 'Model havuzu kaydedildi' });
  } else {
    res.status(500).json({ success: false, message: 'Kayıt hatası' });
  }
});

// --- HISTORY ---
app.get('/api/history', (req, res) => {
  const history = readData('history.json') || [];
  res.json(history);
});

app.post('/api/history', (req, res) => {
  const history = req.body;
  if (writeData('history.json', history)) {
    res.json({ success: true, message: 'Geçmiş kaydedildi' });
  } else {
    res.status(500).json({ success: false, message: 'Kayıt hatası' });
  }
});

// Tek bir history item ekle
app.post('/api/history/add', (req, res) => {
  const newItem = req.body;
  const history = readData('history.json') || [];
  history.push(newItem);
  if (writeData('history.json', history)) {
    res.json({ success: true, message: 'Geçmiş eklendi' });
  } else {
    res.status(500).json({ success: false, message: 'Kayıt hatası' });
  }
});

// 🆕 Tek bir history item sil
app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;
  let history = readData('history.json') || [];
  const initialLength = history.length;
  history = history.filter(item => item.id !== id);

  if (history.length < initialLength) {
    if (writeData('history.json', history)) {
      res.json({ success: true, message: 'Geçmiş silindi' });
    } else {
      res.status(500).json({ success: false, message: 'Silme hatası' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
  }
});

// --- ARCHIVES ---
app.get('/api/archives', (req, res) => {
  const archives = readData('archives.json') || [];
  res.json(archives);
});

app.post('/api/archives', (req, res) => {
  const archives = req.body;
  if (writeData('archives.json', archives)) {
    res.json({ success: true, message: 'Arşivler kaydedildi' });
  } else {
    res.status(500).json({ success: false, message: 'Kayıt hatası' });
  }
});

// Tek bir archive ekle
app.post('/api/archives/add', (req, res) => {
  const newArchive = req.body;
  const archives = readData('archives.json') || [];
  archives.push(newArchive);
  if (writeData('archives.json', archives)) {
    res.json({ success: true, message: 'Arşiv eklendi' });
  } else {
    res.status(500).json({ success: false, message: 'Kayıt hatası' });
  }
});

// 🆕 Tek bir archive sil
app.delete('/api/archives/:id', (req, res) => {
  const { id } = req.params;
  let archives = readData('archives.json') || [];
  const initialLength = archives.length;
  archives = archives.filter(item => item.id !== id);

  if (archives.length < initialLength) {
    if (writeData('archives.json', archives)) {
      res.json({ success: true, message: 'Arşiv silindi' });
    } else {
      res.status(500).json({ success: false, message: 'Silme hatası' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
  }
});

// --- SETUP ---
app.get('/api/setup', (req, res) => {
  const setup = readData('setup.json') || {};
  res.json(setup);
});

app.post('/api/setup', (req, res) => {
  const setup = req.body;
  if (writeData('setup.json', setup)) {
    res.json({ success: true, message: 'Kurulum kaydedildi' });
  } else {
    res.status(500).json({ success: false, message: 'Kayıt hatası' });
  }
});

// --- PROMPT TEMPLATES ---
app.get('/api/templates', (req, res) => {
  const templates = readData('templates.json') || {};
  res.json(templates);
});

app.post('/api/templates', (req, res) => {
  const templates = req.body;
  if (writeData('templates.json', templates)) {
    res.json({ success: true, message: 'Şablonlar kaydedildi' });
  } else {
    res.status(500).json({ success: false, message: 'Kayıt hatası' });
  }
});

// Tek bir mode için template güncelle
app.patch('/api/templates/:mode', (req, res) => {
  const { mode } = req.params;
  const updates = req.body;
  const templates = readData('templates.json') || {};

  if (!templates[mode]) {
    return res.status(404).json({ success: false, message: 'Mod bulunamadı' });
  }

  templates[mode] = { ...templates[mode], ...updates };

  if (writeData('templates.json', templates)) {
    res.json({ success: true, message: `${mode} şablonu güncellendi` });
  } else {
    res.status(500).json({ success: false, message: 'Kayıt hatası' });
  }
});

// Varsayılan şablonlara dön
app.post('/api/templates/reset', (req, res) => {
  const defaultTemplates = {
    "NEXUS": {
      "description": "İşbirlikçi Karar Alma",
      "moderator": "Sen TETRA platformunda uzlaşı odaklı bir moderatörsün. Görevin:\n- Yapıcı diyaloğu teşvik et\n- Her turda somut kararlar al\n- Çatışmaları uzlaşıya dönüştür\n- Teknik detayları özetle\n- Konsensüs sağlandığında [OTURUM_SONLANDI] yaz\n\nTon: Profesyonel, destekleyici, çözüm odaklı.",
      "participant": "Sen bir teknik uzmansın. Bu işbirlikçi oturumda:\n- Somut, uygulanabilir çözümler öner\n- Kod snippetları ve şemalar ekle\n- Diğer katılımcıların fikirlerini geliştir\n- Eleştirilerini yapıcı tut\n- Ortak hedefe odaklan\n\nFormat: Markdown kullan, kod bloklarını işaretle."
    },
    "ADVERSARIAL": {
      "description": "Karşıt Görüşlü Tartışma",
      "moderator": "Sen TETRA platformunda tarafsız bir hakem moderatörsün. Görevin:\n- Argüman kalitesini değerlendir\n- Her iki tarafın da adil söz hakkı almasını sağla\n- Mantık hatalarını işaret et\n- Güçlü/zayıf noktaları özetle\n- Kazanan argümanı ilan et\n\nTon: Nesnel, analitik, adil.",
      "participant": "Sen bir tartışmacısın. Bu adversarial oturumda:\n- Pozisyonunu güçlü argümanlarla savun\n- Karşı tarafın zayıf noktalarını hedef al\n- Kanıt ve örnekler sun\n- Mantıksal tutarlılığı koru\n- Retorik teknikleri kullan\n\nFormat: Tez → Kanıt → Sonuç yapısını izle."
    },
    "SYMPOSIUM": {
      "description": "Akademik Sempozyum",
      "moderator": "Sen TETRA platformunda akademik bir oturum başkanısın. Görevin:\n- Bilimsel standartları koru\n- Kaynak ve referans iste\n- Metodoloji tartışmalarını yönet\n- Peer review mantığıyla ilerle\n- Konsensüs noktalarını belgele\n\nTon: Akademik, titiz, kanıt-tabanlı.",
      "participant": "Sen bir akademisyen/araştırmacısın. Bu sempozyumda:\n- Bilimsel metodoloji kullan\n- Kaynak ve referans göster\n- Hipotez → Deney → Sonuç yapısını izle\n- Belirsizlikleri kabul et\n- Peer feedback'e açık ol\n\nFormat: Akademik makale stili, alıntılar [1] formatında."
    }
  };

  if (writeData('templates.json', defaultTemplates)) {
    res.json({ success: true, message: 'Şablonlar varsayılana döndürüldü', templates: defaultTemplates });
  } else {
    res.status(500).json({ success: false, message: 'Reset hatası' });
  }
});

// --- CACHED MODELS ---
app.get('/api/models/cached', (req, res) => {
  const filepath = path.join(DATA_DIR, 'cached_models.json');
  try {
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json([]);
    }
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/models/cached', (req, res) => {
  const models = req.body;
  if (writeData('cached_models.json', models)) {
    res.json({ success: true, message: 'Model cache kaydedildi' });
  } else {
    res.status(500).json({ success: false, message: 'Kayıt hatası' });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🔷 TETRA Backend Server                  ║
║   Port: ${PORT}                              ║
║   http://localhost:${PORT}                   ║
╚════════════════════════════════════════════╝
  `);
});



