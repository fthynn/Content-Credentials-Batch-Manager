import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, orderBy, limit, serverTimestamp, setLogLevel } from 'firebase/firestore';
import Chart from 'chart.js/auto';

// Global Firebase/App ID'leri
const appId = typeof __app_id !== 'undefined' ? __app_id : 'content-credentials-batch-manager';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Geliştirme modu için Firebase loglarını etkinleştir
setLogLevel('debug');

// Dışarıdan yüklenen kütüphaneler için CDN linkleri
// Chart.js zaten import edildi. Tailwind CDN head tag'inde varsayılıyor.

// ----------------------------------------------------------------------
// 1. VERİ YAPILARI (Simülasyon Verileri)
// ----------------------------------------------------------------------

const MOCK_PRESETS = [
    { id: '1', name: 'SonRa Art - Ticari, Eğitim YASAK', creator: 'Fatih YENEN / SonRa Art', ai_training: 'disallow', license_key: 'COMMERCIAL_NO_REDIST' },
    { id: '2', name: 'CC-BY-SA - Açık Lisans', creator: 'Creative Commons User', ai_training: 'allow', license_key: 'CC-BY-SA' },
];

const VIEWS = {
    DASHBOARD: 'Dashboard',
    REPORT: 'Report',
};

// ----------------------------------------------------------------------
// 2. FIREBASE VE AUTH MANTIĞI
// ----------------------------------------------------------------------

let app, db, auth;

const useFirebase = () => {
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [dbInstance, setDbInstance] = useState(null);

    useEffect(() => {
        try {
            if (Object.keys(firebaseConfig).length === 0) {
                console.error("Firebase konfigürasyonu eksik.");
                setIsAuthReady(true);
                return;
            }

            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            setDbInstance(db);

            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    setIsAuthReady(true);
                } else if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    const anonymousUser = await signInAnonymously(auth);
                    setUserId(anonymousUser.user.uid);
                    setIsAuthReady(true);
                }
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase başlatılırken hata:", e);
            setIsAuthReady(true);
        }
    }, []);

    return { db: dbInstance, userId, isAuthReady };
};

// ----------------------------------------------------------------------
// 3. CORE UYGULAMA BİLEŞENLERİ
// ----------------------------------------------------------------------

/**
 * Dosyaları sürükle bırak ile alan alan.
 */
const DragDropArea = ({ setFiles }) => {
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    };

    return (
        <div
            className="w-full h-40 border-4 border-dashed border-indigo-300 rounded-lg flex items-center justify-center bg-indigo-50/50 hover:bg-indigo-100 transition duration-300 p-4"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <p className="text-indigo-600 text-center font-medium">
                Dosyaları buraya sürükleyin ve bırakın (JPG, PNG, WebP, TIFF)
            </p>
        </div>
    );
};

/**
 * Ön ayar (Preset) seçimi ve uygulama başlatma paneli.
 */
const PresetPanel = ({ selectedPreset, setSelectedPreset, files, startBatch, isProcessing }) => {
    const selected = MOCK_PRESETS.find(p => p.id === selectedPreset);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-800">2. Ön Ayar Seçimi</h2>
            <div className="space-y-3">
                {MOCK_PRESETS.map(preset => (
                    <div
                        key={preset.id}
                        className={`p-4 rounded-lg cursor-pointer transition duration-200 border-2 ${selectedPreset === preset.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
                        onClick={() => setSelectedPreset(preset.id)}
                    >
                        <p className="font-semibold text-indigo-700">{preset.name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                            **Yapay Zeka Eğitimi:** {preset.ai_training === 'disallow' ? 'Yasaklandı' : 'İzin Verildi'} | **Lisans:** {preset.license_key}
                        </p>
                    </div>
                ))}
            </div>

            <button
                onClick={startBatch}
                disabled={files.length === 0 || !selectedPreset || isProcessing}
                className={`w-full mt-6 py-3 px-4 rounded-lg font-bold text-white transition duration-300 shadow-md ${files.length > 0 && selectedPreset && !isProcessing
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-indigo-300 cursor-not-allowed'
                    }`}
            >
                {isProcessing ? (
                    <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {files.length} Dosya İşleniyor...
                    </div>
                ) : (
                    `Başlat: ${files.length} Dosyaya Credentials Ekle`
                )}
            </button>
            {selected && (
                <div className="mt-4 p-3 bg-gray-50 border-l-4 border-indigo-400 text-sm text-gray-700 rounded">
                    <p className="font-semibold">Seçili Preset Detayı:</p>
                    <p>Yaratıcı: {selected.creator}</p>
                </div>
            )}
        </div>
    );
};

/**
 * Dosya listesini ve hataları gösteren tablo.
 */
const FileList = ({ files, isProcessing, processedCount, totalCount }) => {
    return (
        <div className="w-full bg-white p-6 rounded-xl shadow-lg border border-gray-100 mt-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">1. Yüklenen Dosyalar ({files.length})</h2>
            <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosya Adı</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boyut</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {files.map((file, index) => (
                            <tr key={index} className={isProcessing && index < processedCount ? 'bg-indigo-50/50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    {isProcessing && index < processedCount ? (
                                        <span className="text-green-600 flex items-center">
                                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                            İşlendi
                                        </span>
                                    ) : isProcessing && index === processedCount ? (
                                        <span className="text-indigo-600 flex items-center">
                                            <svg className="animate-pulse w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10"></circle></svg>
                                            Sırada
                                        </span>
                                    ) : (
                                        <span className="text-gray-500">Bekliyor</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-xs">{file.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isProcessing && (
                <div className="mt-4">
                    <p className="text-sm font-medium text-indigo-600">İlerleme: %{((processedCount / totalCount) * 100).toFixed(0)}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${((processedCount / totalCount) * 100).toFixed(0)}%` }}></div>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Batch İşlem Sonuçları ve Rapor İndirme Görünümü (ReportView)
 * Proof Dashboard gereksinimini karşılar.
 */
const ReportView = ({ reportData, setView }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    useEffect(() => {
        // Rapor verileri değiştiğinde filtreyi sıfırla
        setSearchTerm('');
        setFilterStatus('ALL');
    }, [reportData]);

    // Arama ve filtreleme mantığı
    const filteredData = reportData.filter(item => {
        const matchesSearch = searchTerm === '' || 
                              item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (item.hash && item.hash.includes(searchTerm.toLowerCase()));
        
        const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const downloadReport = (format) => {
        const data = filteredData.map(({ errorReason, ...rest }) => ({
            ...rest,
            errorReason: errorReason || 'N/A'
        }));
        
        const filename = `ccm_report_${new Date().toISOString()}.${format.toLowerCase()}`;
        let content;

        if (format === 'JSON') {
            content = JSON.stringify(data, null, 2);
            // Simüle indirme: JSON
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

        } else if (format === 'CSV') {
            const headers = Object.keys(data[0] || {});
            const csv = [
                headers.join(';'),
                ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName], (key, value) => {
                    return value === null ? '' : value;
                }).replace(/"/g, '')).join(';'))
            ].join('\n');
            
            // Simüle indirme: CSV
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
        console.log(`${filename} indirildi (Simülasyon).`);
    };

    const totalProcessed = reportData.length;
    const successful = reportData.filter(d => d.status === 'SUCCESS').length;
    const failed = totalProcessed - successful;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Batch İşlem Raporu</h1>
            <p className="text-gray-600 mb-6">
                İşlem tamamlandı! Aşağıdaki **Proof Dashboard** üzerinde tüm işlenen dosyaların sonuçlarını, hash bilgilerini ve hata nedenlerini görebilirsiniz.
            </p>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-indigo-500 text-white p-4 rounded-xl shadow-lg">
                    <p className="text-sm">Toplam İşlenen</p>
                    <p className="text-2xl font-bold">{totalProcessed}</p>
                </div>
                <div className="bg-green-500 text-white p-4 rounded-xl shadow-lg">
                    <p className="text-sm">Başarılı</p>
                    <p className="text-2xl font-bold">{successful}</p>
                </div>
                <div className="bg-red-500 text-white p-4 rounded-xl shadow-lg">
                    <p className="text-sm">Başarısız</p>
                    <p className="text-2xl font-bold">{failed}</p>
                </div>
            </div>
            
            {/* Arama ve Filtreleme (Proof Dashboard Özelliği) */}
            <div className="flex space-x-4 mb-6">
                <input
                    type="text"
                    placeholder="Dosya Adı veya Hash ile Ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg"
                >
                    <option value="ALL">Tüm Durumlar</option>
                    <option value="SUCCESS">Başarılı</option>
                    <option value="FAILED">Başarısız</option>
                </select>
                <button 
                    onClick={() => downloadReport('CSV')} 
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition duration-300"
                >
                    CSV İndir
                </button>
                <button 
                    onClick={() => downloadReport('JSON')} 
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition duration-300"
                >
                    JSON İndir
                </button>
            </div>


            {/* Rapor Tablosu */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="max-h-[60vh] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dosya Adı</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preset</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manifest Hash</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hata Nedeni</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredData.map((item, index) => (
                                <tr key={index} className={item.status === 'FAILED' ? 'bg-red-50/50' : ''}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {item.status === 'SUCCESS' ? 'BAŞARILI' : 'HATALI'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 truncate max-w-xs">{item.fileName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.presetName}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{item.hash || 'N/A'}</td>
                                    <td className="px-4 py-3 text-sm text-red-600 max-w-xs truncate">{item.errorReason || 'Yok'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredData.length === 0 && (
                    <div className="p-4 text-center text-gray-500">Gösterilecek sonuç bulunamadı.</div>
                )}
            </div>
            
            <button 
                onClick={() => setView(VIEWS.DASHBOARD)} 
                className="mt-8 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-medium hover:bg-indigo-200 transition duration-300"
            >
                Yeni İşleme Başla
            </button>
        </div>
    );
};


/**
 * ANA UYGULAMA BİLEŞENİ
 */
const App = () => {
    const { userId, isAuthReady } = useFirebase();
    const [files, setFiles] = useState([]);
    const [selectedPreset, setSelectedPreset] = useState(MOCK_PRESETS[0].id);
    const [view, setView] = useState(VIEWS.DASHBOARD);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedCount, setProcessedCount] = useState(0);
    const [reportData, setReportData] = useState([]);

    // Firebase'de Rapor Sonuçlarını Kaydetme Simülasyonu (Firestore)
    const saveReportToDB = useCallback(async (report) => {
        if (!userId) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        // Kısıt: Public data yolunu kullanıyoruz, çünkü raporlar paylasilabilir kanittir.
        const docRef = doc(db, `artifacts/${appId}/public/data/batch_reports`, `${userId}-${timestamp}`);

        try {
            await setDoc(docRef, {
                userId: userId,
                timestamp: serverTimestamp(),
                presetId: selectedPreset,
                reportSummary: report,
                totalFiles: report.length,
                successCount: report.filter(d => d.status === 'SUCCESS').length,
            });
            console.log("Rapor Firestore'a başarıyla kaydedildi.");
        } catch (e) {
            console.error("Firestore'a rapor kaydedilirken hata:", e);
        }
    }, [userId, selectedPreset]);


    // Backend Batch Sürecini Simüle Eden Fonksiyon
    const mockBackendProcess = useCallback(() => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setProcessedCount(0);
        setReportData([]);

        let currentReport = [];
        let index = 0;

        const processNextFile = () => {
            if (index >= files.length) {
                setIsProcessing(false);
                setReportData(currentReport);
                saveReportToDB(currentReport); // Firestore'a kaydet
                setView(VIEWS.REPORT); // Rapor ekranına geç
                return;
            }

            const file = files[index];
            const fileName = file.name;
            const preset = MOCK_PRESETS.find(p => p.id === selectedPreset);

            let status, hash, errorReason;

            // Hata Simülasyonları: Bozuk dosya, Etik kural ihlali
            if (fileName.includes('hata') || fileName.includes('bozuk')) {
                status = 'FAILED';
                hash = null;
                errorReason = fileName.includes('etik') 
                    ? `[Etik Kural Ihali] Baskasinin 'Do Not Train' isaretini kaldirma girisimi.` 
                    : `[G/Ç Hatası] Dosya okunamadı veya c2pa manifest yazılırken bozuldu.`;
            } else {
                status = 'SUCCESS';
                hash = `ccm_hash_${Math.random().toString(36).substring(2, 10)}`;
                errorReason = null;
            }

            currentReport.push({
                status,
                fileName,
                presetName: preset?.name || 'Bilinmiyor',
                hash,
                errorReason,
                timestamp: new Date().toLocaleTimeString(),
            });

            setProcessedCount(index + 1);

            // Kuyruk sistemini ve KMS imzalama gecikmesini simüle et
            setTimeout(() => {
                index++;
                processNextFile();
            }, 100); 
        };

        processNextFile();
    }, [files, selectedPreset, saveReportToDB]);

    // Firestore'dan geçmiş raporları çekme (Kanıt Panosu için)
    const [pastReports, setPastReports] = useState([]);

    useEffect(() => {
        if (!isAuthReady) return;

        // Kısıt: Sadece son 5 raporu çekiyoruz. orderBy() kullanilmadigina dikkat edin.
        const q = collection(db, `artifacts/${appId}/public/data/batch_reports`);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reports = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Hash listesini göstermek için, içindeki reportSummary'i düzleştiriyoruz
                processedFiles: doc.data().reportSummary.map(r => ({
                    fileName: r.fileName,
                    status: r.status,
                    hash: r.hash,
                })),
            }));
            // Veriyi JS icinde siralama
            reports.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setPastReports(reports.slice(0, 5)); 
        }, (error) => {
            console.error("Geçmiş raporlar çekilirken hata:", error);
        });

        return () => unsubscribe();
    }, [isAuthReady]);

    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <p className="text-xl text-indigo-600">Kimlik Doğrulanıyor ve Firebase Hazırlanıyor...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
            <header className="mb-8 border-b pb-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-extrabold text-indigo-700">CCM Batch Manager v1.0</h1>
                    <span className="text-sm text-gray-500 font-medium bg-indigo-100 px-3 py-1 rounded-full">
                        Kullanıcı ID: {userId ? userId.substring(0, 8) + '...' : 'Anonim'}
                    </span>
                </div>
                <p className="text-gray-500 mt-1">C2PA/CAI Content Credentials Toplu İşleme ve Raporlama Panosu.</p>
            </header>

            {view === VIEWS.DASHBOARD && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* SOL SÜTUN: Dosya Yükleme */}
                    <div className="lg:col-span-2">
                        <p className="text-gray-700 mb-4 text-sm border-b pb-2">
                            **Bu Bölüm:** Toplu işlem için dosyaları yüklemenizi ve sürecin ön ayarını seçmenizi sağlar. Kuyruk sistemi ile entegrasyonu simüle eder.
                        </p>
                        <DragDropArea setFiles={setFiles} />
                        <FileList
                            files={files}
                            isProcessing={isProcessing}
                            processedCount={processedCount}
                            totalCount={files.length}
                        />
                    </div>

                    {/* SAĞ SÜTUN: Preset ve Aksiyon */}
                    <div className="lg:col-span-1">
                        <PresetPanel
                            selectedPreset={selectedPreset}
                            setSelectedPreset={setSelectedPreset}
                            files={files}
                            startBatch={mockBackendProcess}
                            isProcessing={isProcessing}
                        />

                         {/* Geçmiş Raporlar (Proof Dashboard Snapshot) */}
                        <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">3. Geçmiş İşlemler (Son 5)</h2>
                            <p className="text-sm text-gray-600 mb-3">
                                İşlenen batch'lerin anlık özeti. Detaylı arama ve filtreleme için Rapor Görünümünü kullanın.
                            </p>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {pastReports.length > 0 ? (
                                    pastReports.map((report, index) => (
                                        <div key={report.id} className="p-3 border rounded-lg bg-gray-50">
                                            <p className="text-sm font-semibold text-indigo-700">
                                                Batch ID: {report.id.substring(report.id.length - 8)}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                {report.successCount} Başarılı / {report.totalFiles} Toplam
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(report.timestamp?.seconds * 1000).toLocaleString('tr-TR')}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-4">Henüz işlenen rapor yok.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === VIEWS.REPORT && (
                <ReportView reportData={reportData} setView={setView} />
            )}
        </div>
    );
};

// React uygulamasını başlatma
document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
        createRoot(rootElement).render(<App />);
    }
});

export default App;
