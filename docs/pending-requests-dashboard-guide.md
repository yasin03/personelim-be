# Bekleyen İstekler Dashboard API Kılavuzu

Bu dokümantasyon, frontend ekibinin bekleyen onay isteklerini (izin, mesai, avans) tek bir endpoint üzerinden alabilmesi için hazırlanmıştır.

## Genel Bakış

`/dashboard/pending-requests` endpoint'i, owner ve manager kullanıcılarının tüm bekleyen onay isteklerini (pending status) tek bir çağrıda toplar ve özet bilgi döner. Bu endpoint, bildirim sistemleri ve dashboard'lar için optimize edilmiştir.

## Endpoint Bilgileri

**URL:** `GET /dashboard/pending-requests`

**Yetkilendirme:** 
- `authenticateToken` middleware gerekli
- Sadece `owner` ve `manager` rolleri erişebilir

**Query Parametreleri:** Yok (tüm bekleyen istekler otomatik olarak döner)

## Response Formatı

### Başarılı Response (200 OK)

```json
{
  "message": "Pending requests summary retrieved successfully",
  "data": {
    "total": 15,
    "leaves": {
      "count": 8,
      "recent": [
        {
          "id": "leave123",
          "employeeId": "emp456",
          "type": "yıllık",
          "startDate": "2024-01-15",
          "endDate": "2024-01-20",
          "reason": "Tatil",
          "createdAt": "2024-01-10T10:30:00.000Z"
        }
      ]
    },
    "timesheets": {
      "count": 5,
      "recent": [
        {
          "id": "timesheet789",
          "employeeId": "emp456",
          "date": "2024-01-12",
          "status": "tamamlandı",
          "totalHoursWorked": 8.5,
          "overtimeHours": 1.5,
          "createdAt": "2024-01-12T18:00:00.000Z"
        }
      ]
    },
    "advances": {
      "count": 2,
      "recent": [
        {
          "id": "advance321",
          "employeeId": "emp456",
          "amount": 5000,
          "reason": "Acil ihtiyaç",
          "createdAt": "2024-01-11T14:20:00.000Z"
        }
      ]
    },
    "lastUpdated": "2024-01-13T09:15:00.000Z"
  }
}
```

### Hata Response'ları

**403 Forbidden:**
```json
{
  "error": "Forbidden",
  "message": "Associated business not found for manager user"
}
```

**404 Not Found:**
```json
{
  "error": "Not Found",
  "message": "Business owner could not be determined"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to get pending requests summary",
  "details": "..." // Sadece development ortamında
}
```

## Response Alanları Açıklaması

### `data.total`
- **Tip:** `number`
- **Açıklama:** Tüm bekleyen isteklerin toplam sayısı (leaves + timesheets + advances)

### `data.leaves`
- **Tip:** `object`
- **Alanlar:**
  - `count`: Bekleyen izin taleplerinin toplam sayısı
  - `recent`: En son 5 izin talebi (en yeni önce sıralı)

### `data.timesheets`
- **Tip:** `object`
- **Alanlar:**
  - `count`: Bekleyen mesai kayıtlarının toplam sayısı
  - `recent`: En son 5 mesai kaydı (en yeni önce sıralı)

### `data.advances`
- **Tip:** `object`
- **Alanlar:**
  - `count`: Bekleyen avans taleplerinin toplam sayısı
  - `recent`: En son 5 avans talebi (en yeni önce sıralı)

### `data.lastUpdated`
- **Tip:** `string` (ISO 8601 formatında)
- **Açıklama:** Response'un oluşturulma zamanı

## Recent Items Detayları

### Leave (İzin) Recent Item
```typescript
{
  id: string;              // İzin talebi ID'si
  employeeId: string;       // Çalışan ID'si
  type: string;            // İzin tipi: "günlük" | "yıllık" | "mazeret"
  startDate: string;       // Başlangıç tarihi (YYYY-MM-DD)
  endDate: string;         // Bitiş tarihi (YYYY-MM-DD)
  reason: string | null;   // Açıklama
  createdAt: string;       // Oluşturulma zamanı (ISO 8601)
}
```

### Timesheet (Mesai) Recent Item
```typescript
{
  id: string;              // Mesai kaydı ID'si
  employeeId: string;      // Çalışan ID'si
  date: string;           // Tarih (YYYY-MM-DD)
  status: string;         // Durum: "tamamlandı" | "yarım" | "eksik"
  totalHoursWorked: number; // Toplam çalışılan saat
  overtimeHours: number;   // Mesai saati
  createdAt: string;       // Oluşturulma zamanı (ISO 8601)
}
```

### Advance (Avans) Recent Item
```typescript
{
  id: string;              // Avans talebi ID'si
  employeeId: string;      // Çalışan ID'si
  amount: number;          // Talep edilen miktar
  reason: string | null;   // Açıklama
  createdAt: string;       // Oluşturulma zamanı (ISO 8601)
}
```

## Frontend Entegrasyonu

### TypeScript Type Tanımları

```typescript
interface PendingLeave {
  id: string;
  employeeId: string;
  type: "günlük" | "yıllık" | "mazeret";
  startDate: string;
  endDate: string;
  reason: string | null;
  createdAt: string;
}

interface PendingTimesheet {
  id: string;
  employeeId: string;
  date: string;
  status: string;
  totalHoursWorked: number;
  overtimeHours: number;
  createdAt: string;
}

interface PendingAdvance {
  id: string;
  employeeId: string;
  amount: number;
  reason: string | null;
  createdAt: string;
}

interface PendingRequestsSummary {
  total: number;
  leaves: {
    count: number;
    recent: PendingLeave[];
  };
  timesheets: {
    count: number;
    recent: PendingTimesheet[];
  };
  advances: {
    count: number;
    recent: PendingAdvance[];
  };
  lastUpdated: string;
}

interface PendingRequestsResponse {
  message: string;
  data: PendingRequestsSummary;
}
```

### React Örneği (Axios ile)

```typescript
import axios from 'axios';
import { useEffect, useState } from 'react';

const usePendingRequests = () => {
  const [data, setData] = useState<PendingRequestsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get<PendingRequestsResponse>(
        '/dashboard/pending-requests',
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      
      setData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Bekleyen istekler alınamadı');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    
    // Her 30 saniyede bir güncelle (polling)
    const interval = setInterval(fetchPendingRequests, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: fetchPendingRequests };
};

// Kullanım
const Dashboard = () => {
  const { data, loading, error } = usePendingRequests();

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <h2>Bekleyen İstekler</h2>
      <div>
        <p>Toplam: {data.total}</p>
        <p>İzinler: {data.leaves.count}</p>
        <p>Mesailer: {data.timesheets.count}</p>
        <p>Avanslar: {data.advances.count}</p>
      </div>
      
      {/* Bildirim badge'i */}
      {data.total > 0 && (
        <div className="notification-badge">
          {data.total}
        </div>
      )}
    </div>
  );
};
```

### Vue 3 Örneği (Composition API)

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';

export const usePendingRequests = () => {
  const data = ref<PendingRequestsSummary | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  let pollingInterval: number | null = null;

  const fetchPendingRequests = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await axios.get<PendingRequestsResponse>(
        '/dashboard/pending-requests',
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      
      data.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Bekleyen istekler alınamadı';
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    fetchPendingRequests();
    pollingInterval = window.setInterval(fetchPendingRequests, 30000);
  });

  onUnmounted(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  });

  return { data, loading, error, refetch: fetchPendingRequests };
};
```

## UI/UX Önerileri

### 1. Bildirim Badge'i
- Toplam bekleyen istek sayısını (`data.total`) badge olarak gösterin
- Badge'i header, sidebar veya dashboard'da görünür bir yerde konumlandırın
- Sayı 0'dan büyükse badge'i vurgulayın (kırmızı, turuncu renk)

### 2. Dashboard Widget'ı
- Her kategori için (leaves, timesheets, advances) ayrı kartlar oluşturun
- Her kartta:
  - Kategori adı
  - Bekleyen sayı (büyük ve vurgulu)
  - "Detayları Gör" butonu
  - En son 3-5 isteğin özeti

### 3. Real-time Güncelleme
- Polling kullanarak düzenli güncelleme yapın (30-60 saniye aralıklarla)
- Kullanıcı sayfayı yenilediğinde veya sayfaya döndüğünde otomatik güncelleme
- WebSocket veya Server-Sent Events kullanılabilirse daha iyi performans

### 4. Detay Sayfasına Yönlendirme
- Her kategori için detay sayfasına yönlendirme linki ekleyin
- Örnek:
  - İzinler: `/leaves/pending`
  - Mesailer: `/timesheets/pending`
  - Avanslar: `/advances/pending`

### 5. Employee Bilgisi
- `recent` array'indeki item'larda `employeeId` var
- Employee bilgilerini almak için ayrı bir API çağrısı yapmanız gerekebilir
- Veya detay sayfasında employee bilgilerini gösterin

## Önemli Notlar

1. **Pending Status:** Bu endpoint sadece `status: "pending"` veya `approvalStatus: "pending"` olan istekleri döner. Onaylanmış veya reddedilmiş istekler dahil değildir.

2. **Expired Leaves:** Dashboard'da expired (süresi geçmiş) pending leaves de gösterilir. Eğer sadece geçerli olanları göstermek isterseniz, frontend'de filtreleme yapabilirsiniz:
   ```typescript
   const validLeaves = data.leaves.recent.filter(leave => {
     const endDate = new Date(leave.endDate);
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     return endDate >= today;
   });
   ```

3. **Performance:** Endpoint paralel sorgular kullanarak optimize edilmiştir. Yine de çok fazla çalışanı olan işletmelerde polling aralığını dikkatli ayarlayın.

4. **Caching:** Frontend'de response'u cache'leyebilirsiniz, ancak kısa süreli (30-60 saniye) cache kullanın.

5. **Error Handling:** Network hatalarında kullanıcıya bilgi verin ve retry mekanizması ekleyin.

## İleride Eklenecek Özellikler

Bu endpoint yapısı, ileride eklenebilecek diğer onay gerektiren işlemler için genişletilebilir:

- İzin değişiklik talepleri
- Maaş artış talepleri
- İş değişiklik talepleri
- vb.

Yeni bir kategori eklendiğinde, response formatına yeni bir alan eklenir ve frontend'de minimal değişiklikle entegre edilebilir.

## Test Senaryoları

1. **Boş Durum:** Hiç bekleyen istek yoksa, tüm count'lar 0 ve recent array'leri boş olmalı
2. **Sadece İzinler:** Sadece izin talepleri varsa, diğer kategoriler 0 olmalı
3. **Manager Kullanıcı:** Manager kullanıcıları için owner'ın tüm çalışanlarının istekleri görünmeli
4. **Owner Kullanıcı:** Owner kullanıcıları için kendi çalışanlarının istekleri görünmeli
5. **Çoklu İstek:** Her kategoriden birden fazla istek olduğunda, recent array'inde en yeni 5 tanesi olmalı

## Örnek Kullanım Senaryoları

### Senaryo 1: Dashboard Badge
```typescript
// Header component'inde
const { data } = usePendingRequests();

return (
  <header>
    <nav>
      <Link to="/dashboard">
        Dashboard
        {data?.total > 0 && (
          <span className="badge">{data.total}</span>
        )}
      </Link>
    </nav>
  </header>
);
```

### Senaryo 2: Notification Center
```typescript
// Notification center component'inde
const { data } = usePendingRequests();

return (
  <div className="notification-center">
    <h3>Bekleyen Onaylar</h3>
    {data?.leaves.count > 0 && (
      <NotificationItem
        type="leave"
        count={data.leaves.count}
        onClick={() => navigate('/leaves/pending')}
      />
    )}
    {data?.timesheets.count > 0 && (
      <NotificationItem
        type="timesheet"
        count={data.timesheets.count}
        onClick={() => navigate('/timesheets/pending')}
      />
    )}
    {data?.advances.count > 0 && (
      <NotificationItem
        type="advance"
        count={data.advances.count}
        onClick={() => navigate('/advances/pending')}
      />
    )}
  </div>
);
```

## Sorun Giderme

### Problem: Veri gelmiyor
- **Kontrol:** Token'ın geçerli olduğundan emin olun
- **Kontrol:** Kullanıcı rolünün `owner` veya `manager` olduğundan emin olun
- **Kontrol:** Backend loglarını kontrol edin

### Problem: Count'lar yanlış
- **Kontrol:** Backend'de pending status kontrolünü doğrulayın
- **Kontrol:** Employee'lerin doğru owner'a bağlı olduğundan emin olun

### Problem: Recent items eksik
- **Not:** Recent array'inde maksimum 5 item olur
- **Kontrol:** Tüm istekleri görmek için ilgili detay endpoint'lerini kullanın

## İletişim

Sorularınız için backend ekibiyle iletişime geçin.

