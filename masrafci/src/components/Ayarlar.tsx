import { useState } from 'react';
import { User, Bell, Shield, CreditCard, Moon, Globe, HelpCircle, LogOut, Monitor, Check } from 'lucide-react';

export default function Ayarlar() {
  const [activeTab, setActiveTab] = useState('hesap');

  const menuItems = [
    { id: 'hesap', label: 'Hesap Bilgileri', icon: User },
    { id: 'bildirim', label: 'Bildirimler', icon: Bell },
    { id: 'guvenlik', label: 'Güvenlik', icon: Shield },
    { id: 'odeme', label: 'Ödeme Yöntemleri', icon: CreditCard },
    { id: 'gorunum', label: 'Görünüm', icon: Moon },
    { id: 'dil', label: 'Dil ve Bölge', icon: Globe },
    { id: 'yardim', label: 'Yardım', icon: HelpCircle },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'hesap':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Profil Bilgileri</h2>
            
            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-md overflow-hidden relative group cursor-pointer">
                <img src="https://i.pravatar.cc/150?img=11" alt="Profil" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">Değiştir</span>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Ahmet Yılmaz</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">ahmet.yilmaz@example.com</p>
                <button className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                  Fotoğrafı Kaldır
                </button>
              </div>
            </div>

            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ad</label>
                  <input type="text" defaultValue="Ahmet" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Soyad</label>
                  <input type="text" defaultValue="Yılmaz" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">E-posta</label>
                  <input type="email" defaultValue="ahmet.yilmaz@example.com" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefon</label>
                  <input type="tel" defaultValue="+90 555 123 4567" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors" />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-800">
                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        );

      case 'bildirim':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Bildirim Tercihleri</h2>
            <div className="space-y-6">
              {[
                { title: 'E-posta Bildirimleri', desc: 'Aylık özetler ve önemli güncellemeler', defaultChecked: true },
                { title: 'Push Bildirimleri', desc: 'Yaklaşan ödemeler ve faturalar için hatırlatmalar', defaultChecked: true },
                { title: 'SMS Bildirimleri', desc: 'Sadece güvenlik uyarıları ve şifre sıfırlama', defaultChecked: false },
                { title: 'Pazarlama İletişimi', desc: 'Yeni özellikler ve kampanyalar hakkında bilgi', defaultChecked: false },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-800 last:border-0">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={item.defaultChecked} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'guvenlik':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Güvenlik Ayarları</h2>
            <form className="space-y-6 mb-8" onSubmit={(e) => e.preventDefault()}>
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Şifre Değiştir</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mevcut Şifre</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yeni Şifre</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yeni Şifre (Tekrar)</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all">
                  Şifreyi Güncelle
                </button>
              </div>
            </form>
            
            <hr className="border-gray-100 dark:border-slate-800 my-6" />
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">İki Faktörlü Doğrulama (2FA)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hesabınızı daha güvenli hale getirmek için SMS veya Authenticator uygulaması kullanın.</p>
              </div>
              <button className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
                Aktifleştir
              </button>
            </div>
          </div>
        );

      case 'gorunum':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Görünüm Ayarları</h2>
            <div className="flex flex-col items-center justify-center text-center py-8">
              <Monitor className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Portal Teması Aktif</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                Tema ayarları portal üzerinden yönetilmektedir. Sol menüdeki Ayarlar sayfasından tema değişikliği yapabilirsiniz.
              </p>
            </div>
          </div>
        );

      case 'dil':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Dil ve Bölge</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Uygulama Dili</label>
                <select className="w-full h-12 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white">
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Para Birimi</label>
                <select className="w-full h-12 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white">
                  <option value="TRY">Türk Lirası (₺)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>
              <div className="flex justify-end pt-4">
                <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all">
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors flex flex-col items-center justify-center text-center min-h-[300px]">
            <Monitor className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">Bu Bölüm Yapım Aşamasında</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">Bu ayar sayfası çok yakında kullanıma açılacaktır.</p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1 transition-colors">Ayarlar</h1>
        <p className="text-gray-500 dark:text-gray-400 transition-colors">Hesap ve uygulama tercihlerinizi yönetin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Sol Menü */}
        <div className="col-span-1 md:col-span-4 lg:col-span-3 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === item.id 
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
          
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-slate-800">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <LogOut className="w-5 h-5" />
              Çıkış Yap
            </button>
          </div>
        </div>

        {/* Sağ İçerik */}
        <div className="col-span-1 md:col-span-8 lg:col-span-9 space-y-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
