# Bekleyen Talepler Bildirim Sistemi - Frontend Entegrasyon Rehberi

Bu doküman, Owner ve Manager kullanıcılarının bekleyen tüm talepleri (izin, mesai, avans) görüntülemesi ve bildirim alması için gerekli API entegrasyonunu açıklar.

## 📋 Genel Bakış

Owner ve Manager kullanıcıları, kendi işletmelerindeki tüm bekleyen talepleri (pending requests) tek bir endpoint üzerinden görüntüleyebilir. Bu endpoint, tüm bekleyen taleplerin sayısını ve özetini döndürür.

## 🔗 Endpoint

```
GET /dashboard/pending-requests
```

## 🔐 Yetkilendirme

- **Gerekli Rol:** `owner` veya `manager`
- **Auth Header:** `Authorization: Bearer <jwt-token>`
- **Employee kullanıcıları bu endpoint'e erişemez** (403 Forbidden)

## 📤 Yanıt Formatı

### Başarılı Yanıt (200 OK)

```json
{
  "message": "Pending requests summary retrieved successfully",
  "data": {
    "total": 15,
    "leaves": {
      "count": 8,
      "recent": [
        {
          "id": "leave-id-123",
          "employeeId": "employee-id-456",
          "type": "yıllık",
          "startDate": "2024-12-20",
          "endDate": "2024-12-25",
          "createdAt": "2024-12-15T10:30:00.000Z"
        }
      ]
    },
    "timesheets": {
      "count": 5,
      "recent": [
        {
          "id": "timesheet-id-789",
          "employeeId": "employee-id-456",
          "date": "2024-12-18",
          "status": "Çalıştı",
          "createdAt": "2024-12-18T09:00:00.000Z"
        }
      ]
    },
    "advances": {
      "count": 2,
      "recent": [
        {
          "id": "advance-id-321",
          "employeeId": "employee-id-789",
          "amount": 5000,
          "reason": "Acil masraf",
          "createdAt": "2024-12-16T14:20:00.000Z"
        }
      ]
    },
    "lastUpdated": "2024-12-19T10:00:00.000Z"
  }
}
```

### Hata Yanıtları

#### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "User must be authenticated"
}
```

#### 403 Forbidden
```json
{
  "error": "Access denied",
  "message": "Manager or Owner access required"
}
```

## 💻 Frontend Entegrasyon Örnekleri

### TypeScript/React Örneği

```typescript
// types/dashboard.ts
export interface PendingRequestSummary {
  total: number;
  leaves: {
    count: number;
    recent: Array<{
      id: string;
      employeeId: string;
      type: string;
      startDate: string;
      endDate: string;
      createdAt: string;
    }>;
  };
  timesheets: {
    count: number;
    recent: Array<{
      id: string;
      employeeId: string;
      date: string;
      status: string;
      createdAt: string;
    }>;
  };
  advances: {
    count: number;
    recent: Array<{
      id: string;
      employeeId: string;
      amount: number;
      reason: string;
      createdAt: string;
    }>;
  };
  lastUpdated: string;
}

export interface PendingRequestsResponse {
  message: string;
  data: PendingRequestSummary;
}

// services/dashboardService.ts
import axios from "axios";
import { PendingRequestsResponse } from "../types/dashboard";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export const dashboardService = {
  /**
   * Bekleyen taleplerin özetini getir
   */
  async getPendingRequests(): Promise<PendingRequestsResponse> {
    const token = localStorage.getItem("authToken");
    
    const response = await axios.get<PendingRequestsResponse>(
      `${API_BASE_URL}/dashboard/pending-requests`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    return response.data;
  },
};
```

### React Hook ile Polling Örneği

```tsx
// hooks/usePendingRequests.ts
import { useState, useEffect, useRef } from "react";
import { dashboardService } from "../services/dashboardService";
import { PendingRequestSummary } from "../types/dashboard";

interface UsePendingRequestsOptions {
  pollInterval?: number; // Polling interval in milliseconds (default: 30000 = 30 seconds)
  enabled?: boolean; // Enable/disable polling (default: true)
}

export const usePendingRequests = (
  options: UsePendingRequestsOptions = {}
) => {
  const { pollInterval = 30000, enabled = true } = options;
  const [data, setData] = useState<PendingRequestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPendingRequests = async () => {
    try {
      setError(null);
      const response = await dashboardService.getPendingRequests();
      setData(response.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Bekleyen talepler yüklenirken hata oluştu");
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchPendingRequests();

    // Set up polling if enabled
    if (enabled) {
      intervalRef.current = setInterval(() => {
        fetchPendingRequests();
      }, pollInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [pollInterval, enabled]);

  // Manual refresh function
  const refresh = () => {
    setLoading(true);
    fetchPendingRequests();
  };

  return {
    data,
    loading,
    error,
    refresh,
    total: data?.total || 0,
    leavesCount: data?.leaves.count || 0,
    timesheetsCount: data?.timesheets.count || 0,
    advancesCount: data?.advances.count || 0,
  };
};
```

### Notification Badge Component

```tsx
// components/PendingRequestsBadge.tsx
import React from "react";
import { usePendingRequests } from "../hooks/usePendingRequests";

const PendingRequestsBadge: React.FC = () => {
  const { total, loading } = usePendingRequests({
    pollInterval: 30000, // 30 saniyede bir güncelle
    enabled: true,
  });

  if (loading) {
    return (
      <div className="relative">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
      </div>
    );
  }

  if (total === 0) {
    return null;
  }

  return (
    <div className="relative">
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
        {total > 99 ? "99+" : total}
      </span>
      <svg
        className="w-6 h-6 text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    </div>
  );
};

export default PendingRequestsBadge;
```

### Dashboard Widget Component

```tsx
// components/PendingRequestsWidget.tsx
import React from "react";
import { usePendingRequests } from "../hooks/usePendingRequests";
import { useNavigate } from "react-router-dom";

const PendingRequestsWidget: React.FC = () => {
  const {
    data,
    loading,
    error,
    refresh,
    total,
    leavesCount,
    timesheetsCount,
    advancesCount,
  } = usePendingRequests({ pollInterval: 30000 });
  const navigate = useNavigate();

  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={refresh}
          className="mt-2 text-sm text-red-600 underline"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Bekleyen Talepler</h3>
        <button
          onClick={refresh}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Yenile
        </button>
      </div>

      {total === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2">Bekleyen talep bulunmamaktadır</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="text-3xl font-bold text-blue-600">{total}</div>
            <div className="text-sm text-gray-500">Toplam Bekleyen Talep</div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div
              className="cursor-pointer hover:bg-gray-50 p-3 rounded transition-colors"
              onClick={() => navigate("/leaves/pending")}
            >
              <div className="text-2xl font-semibold text-orange-600">
                {leavesCount}
              </div>
              <div className="text-sm text-gray-600">İzin Talepleri</div>
            </div>

            <div
              className="cursor-pointer hover:bg-gray-50 p-3 rounded transition-colors"
              onClick={() => navigate("/timesheets/pending")}
            >
              <div className="text-2xl font-semibold text-blue-600">
                {timesheetsCount}
              </div>
              <div className="text-sm text-gray-600">Mesai Talepleri</div>
            </div>

            <div
              className="cursor-pointer hover:bg-gray-50 p-3 rounded transition-colors"
              onClick={() => navigate("/advances/pending")}
            >
              <div className="text-2xl font-semibold text-green-600">
                {advancesCount}
              </div>
              <div className="text-sm text-gray-600">Avans Talepleri</div>
            </div>
          </div>

          {data && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs text-gray-400">
                Son güncelleme:{" "}
                {new Date(data.lastUpdated).toLocaleString("tr-TR")}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PendingRequestsWidget;
```

### Navigation Bar'da Badge Gösterme

```tsx
// components/NavigationBar.tsx
import React from "react";
import { Link } from "react-router-dom";
import PendingRequestsBadge from "./PendingRequestsBadge";

const NavigationBar: React.FC = () => {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex space-x-8">
            <Link to="/dashboard" className="text-gray-700 hover:text-gray-900">
              Dashboard
            </Link>
            <Link to="/employees" className="text-gray-700 hover:text-gray-900">
              Çalışanlar
            </Link>
            <Link
              to="/pending-requests"
              className="text-gray-700 hover:text-gray-900 relative"
            >
              Bekleyen Talepler
              <PendingRequestsBadge />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
```

### Real-time Updates için WebSocket Alternatifi (Polling)

Eğer WebSocket kullanmıyorsanız, polling ile gerçek zamanlı güncellemeler yapabilirsiniz:

```tsx
// hooks/usePendingRequestsWithNotification.ts
import { useEffect, useRef } from "react";
import { usePendingRequests } from "./usePendingRequests";

interface UsePendingRequestsWithNotificationOptions {
  pollInterval?: number;
  onNewRequest?: (previousTotal: number, newTotal: number) => void;
  showBrowserNotification?: boolean;
}

export const usePendingRequestsWithNotification = (
  options: UsePendingRequestsWithNotificationOptions = {}
) => {
  const { pollInterval = 30000, onNewRequest, showBrowserNotification = true } = options;
  const { data, total } = usePendingRequests({ pollInterval, enabled: true });
  const previousTotalRef = useRef<number>(0);

  useEffect(() => {
    if (data && total > previousTotalRef.current && previousTotalRef.current > 0) {
      const newRequests = total - previousTotalRef.current;
      
      // Callback
      if (onNewRequest) {
        onNewRequest(previousTotalRef.current, total);
      }

      // Browser notification
      if (showBrowserNotification && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("Yeni Bekleyen Talep", {
            body: `${newRequests} yeni bekleyen talep var`,
            icon: "/notification-icon.png",
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification("Yeni Bekleyen Talep", {
                body: `${newRequests} yeni bekleyen talep var`,
                icon: "/notification-icon.png",
              });
            }
          });
        }
      }
    }

    previousTotalRef.current = total;
  }, [total, data, onNewRequest, showBrowserNotification]);

  return { data, total };
};
```

## 🎨 UI/UX Önerileri

### 1. Badge Gösterimi
- Toplam sayıyı kırmızı badge ile gösterin
- 99'dan fazla ise "99+" gösterin
- Badge'e tıklandığında bekleyen talepler sayfasına yönlendirin

### 2. Polling Stratejisi
- **Aktif sayfada:** 30 saniyede bir güncelle
- **Arka planda:** 60 saniyede bir güncelle
- **Sayfa görünür değilken:** Polling'i durdur (Page Visibility API)

### 3. Bildirimler
- Browser notification kullanın (kullanıcı izni ile)
- Yeni talep geldiğinde toast notification gösterin
- Ses bildirimi ekleyebilirsiniz (opsiyonel)

### 4. Performans
- Polling interval'ini akıllıca ayarlayın (çok sık istek atmayın)
- Sayfa görünür değilken polling'i durdurun
- Cache kullanarak gereksiz render'ları önleyin

## ⚠️ Önemli Notlar

1. **Polling Interval:** Varsayılan 30 saniye önerilir. Çok sık istek atmak sunucuyu yorabilir.

2. **Expired İzinler:** Süresi geçmiş pending izinler sayıya dahil edilmez.

3. **Real-time Updates:** Şu anda polling kullanılıyor. Gelecekte WebSocket entegrasyonu eklenebilir.

4. **Browser Notifications:** Kullanıcıdan izin alınmalıdır. `Notification.requestPermission()` kullanın.

5. **Page Visibility:** Sayfa görünür değilken polling'i durdurun:
   ```typescript
   useEffect(() => {
     const handleVisibilityChange = () => {
       if (document.hidden) {
         // Pause polling
       } else {
         // Resume polling
       }
     };
     document.addEventListener("visibilitychange", handleVisibilityChange);
     return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
   }, []);
   ```

## 📊 Örnek Kullanım Senaryoları

### Senaryo 1: Dashboard Widget
```tsx
// Dashboard sayfasında widget olarak göster
<DashboardLayout>
  <PendingRequestsWidget />
  {/* Diğer widget'lar */}
</DashboardLayout>
```

### Senaryo 2: Navigation Badge
```tsx
// Navigation bar'da badge olarak göster
<NavBar>
  <NavItem>
    Bekleyen Talepler
    <PendingRequestsBadge />
  </NavItem>
</NavBar>
```

### Senaryo 3: Notification Center
```tsx
// Notification center'da detaylı göster
<NotificationCenter>
  <PendingRequestsSummary />
</NotificationCenter>
```

## 🔗 İlgili Endpoint'ler

- **Tüm Bekleyen İzinler:** `GET /employees/any/leaves/pending`
- **Tüm Bekleyen Mesailer:** `GET /employees/any/timesheets?approvalStatus=pending` (gelecekte eklenecek)
- **Tüm Bekleyen Avanslar:** `GET /advances?status=pending`

## 📞 Destek

Herhangi bir sorunuz veya sorununuz varsa backend ekibiyle iletişime geçebilirsiniz.

