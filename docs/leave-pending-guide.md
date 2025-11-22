# Bekleyen İzin Talepleri - Frontend Entegrasyon Rehberi

Bu doküman, Owner ve Manager kullanıcılarının tüm bekleyen izin taleplerini görüntülemesi için gerekli API entegrasyonunu açıklar.

## 📋 Genel Bakış

Owner ve Manager kullanıcıları, kendi işletmelerindeki tüm employee'lerin bekleyen (pending) izin taleplerini tek bir endpoint üzerinden görüntüleyebilir. Bu endpoint, tüm employee'lerin pending izinlerini paralel olarak sorgulayarak optimize edilmiştir.

## 🔗 Endpoint

```
GET /employees/:employeeId/leaves/pending
```

**Not:** `employeeId` parametresi route'da bulunur ancak kullanılmaz. Herhangi bir değer olabilir (örn: "any", "all", "pending"). Backend bu parametreyi görmezden gelir.

## 🔐 Yetkilendirme

- **Gerekli Rol:** `owner` veya `manager`
- **Auth Header:** `Authorization: Bearer <jwt-token>`
- **Employee kullanıcıları bu endpoint'e erişemez** (403 Forbidden)

## 📥 Query Parametreleri

| Parametre | Tip | Zorunlu | Varsayılan | Açıklama |
|-----------|-----|---------|------------|----------|
| `page` | number | Hayır | 1 | Sayfa numarası (1'den başlar) |
| `limit` | number | Hayır | 10 | Sayfa başına kayıt sayısı (max: 100) |
| `includeExpired` | boolean | Hayır | false | Süresi geçmiş pending izinleri dahil et |

## 📤 Yanıt Formatı

### Başarılı Yanıt (200 OK)

```json
{
  "message": "Pending leaves retrieved successfully",
  "data": {
    "leaves": [
      {
        "id": "leave-id-123",
        "employeeId": "employee-id-456",
        "type": "yıllık",
        "startDate": "2024-12-20",
        "endDate": "2024-12-25",
        "reason": "Yılbaşı tatili",
        "status": "pending",
        "approved": false,
        "approvedBy": null,
        "approvedAt": null,
        "approvalNote": null,
        "createdAt": "2024-12-15T10:30:00.000Z",
        "updatedAt": "2024-12-15T10:30:00.000Z",
        "employee": {
          "id": "employee-id-456",
          "firstName": "Ahmet",
          "lastName": "Yılmaz",
          "name": "Ahmet Yılmaz",
          "email": "ahmet.yilmaz@example.com",
          "department": "Yazılım Geliştirme",
          "position": "Senior Developer"
        }
      },
      {
        "id": "leave-id-124",
        "employeeId": "employee-id-789",
        "type": "mazeret",
        "startDate": "2024-12-18",
        "endDate": "2024-12-18",
        "reason": "Doktor randevusu",
        "status": "pending",
        "approved": false,
        "approvedBy": null,
        "approvedAt": null,
        "approvalNote": null,
        "createdAt": "2024-12-16T14:20:00.000Z",
        "updatedAt": "2024-12-16T14:20:00.000Z",
        "employee": {
          "id": "employee-id-789",
          "firstName": "Ayşe",
          "lastName": "Demir",
          "name": "Ayşe Demir",
          "email": "ayse.demir@example.com",
          "department": "İnsan Kaynakları",
          "position": "HR Uzmanı"
        }
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
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

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Failed to get pending leaves"
}
```

## 💻 Frontend Entegrasyon Örnekleri

### TypeScript/React Örneği

```typescript
// types/leave.ts
export interface PendingLeave {
  id: string;
  employeeId: string;
  type: "günlük" | "yıllık" | "mazeret";
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  approved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalNote: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string | null;
    department: string | null;
    position: string | null;
  };
}

export interface PendingLeavesResponse {
  message: string;
  data: {
    leaves: PendingLeave[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// services/leaveService.ts
import axios from "axios";
import { PendingLeavesResponse } from "../types/leave";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export const leaveService = {
  /**
   * Tüm bekleyen izin taleplerini getir
   * @param page Sayfa numarası
   * @param limit Sayfa başına kayıt sayısı
   * @param includeExpired Süresi geçmiş izinleri dahil et
   */
  async getPendingLeaves(
    page: number = 1,
    limit: number = 10,
    includeExpired: boolean = false
  ): Promise<PendingLeavesResponse> {
    const token = localStorage.getItem("authToken");
    
    const response = await axios.get<PendingLeavesResponse>(
      `${API_BASE_URL}/employees/any/leaves/pending`,
      {
        params: {
          page,
          limit,
          includeExpired,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    return response.data;
  },
};
```

### React Component Örneği

```tsx
// components/PendingLeavesList.tsx
import React, { useState, useEffect } from "react";
import { leaveService } from "../services/leaveService";
import { PendingLeave } from "../types/leave";

const PendingLeavesList: React.FC = () => {
  const [leaves, setLeaves] = useState<PendingLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [includeExpired, setIncludeExpired] = useState(false);

  useEffect(() => {
    fetchPendingLeaves();
  }, [page, includeExpired]);

  const fetchPendingLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await leaveService.getPendingLeaves(
        page,
        10,
        includeExpired
      );
      setLeaves(response.data.leaves);
      setTotalPages(response.data.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || "İzinler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId: string, employeeId: string) => {
    try {
      // Onay endpoint'ini çağır
      // await leaveService.approveLeave(employeeId, leaveId, "approved");
      await fetchPendingLeaves(); // Listeyi yenile
    } catch (err) {
      console.error("Onay hatası:", err);
    }
  };

  const handleReject = async (leaveId: string, employeeId: string) => {
    try {
      // Reddetme endpoint'ini çağır
      // await leaveService.approveLeave(employeeId, leaveId, "rejected");
      await fetchPendingLeaves(); // Listeyi yenile
    } catch (err) {
      console.error("Reddetme hatası:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      günlük: "Günlük İzin",
      yıllık: "Yıllık İzin",
      mazeret: "Mazeret İzni",
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-red-500">Hata: {error}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Bekleyen İzin Talepleri</h2>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={includeExpired}
            onChange={(e) => setIncludeExpired(e.target.checked)}
            className="mr-2"
          />
          Süresi geçmiş izinleri göster
        </label>
      </div>

      {leaves.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Bekleyen izin talebi bulunmamaktadır.
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {leaves.map((leave) => (
              <div
                key={leave.id}
                className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {leave.employee.name}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-sm ${getStatusColor(
                          leave.status
                        )}`}
                      >
                        Beklemede
                      </span>
                      <span className="text-sm text-gray-500">
                        {getTypeLabel(leave.type)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Departman:</span>{" "}
                      {leave.employee.department || "Belirtilmemiş"}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Pozisyon:</span>{" "}
                      {leave.employee.position || "Belirtilmemiş"}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Tarih:</span>{" "}
                      {new Date(leave.startDate).toLocaleDateString("tr-TR")} -{" "}
                      {new Date(leave.endDate).toLocaleDateString("tr-TR")}
                    </div>
                    {leave.reason && (
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Açıklama:</span>{" "}
                        {leave.reason}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      Talep Tarihi:{" "}
                      {new Date(leave.createdAt).toLocaleString("tr-TR")}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(leave.id, leave.employeeId)}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      Onayla
                    </button>
                    <button
                      onClick={() => handleReject(leave.id, leave.employeeId)}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Önceki
              </button>
              <span className="px-4 py-2">
                Sayfa {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PendingLeavesList;
```

### Vue.js Örneği

```vue
<!-- components/PendingLeavesList.vue -->
<template>
  <div class="pending-leaves">
    <h2>Bekleyen İzin Talepleri</h2>
    
    <div class="controls">
      <label>
        <input
          type="checkbox"
          v-model="includeExpired"
          @change="fetchLeaves"
        />
        Süresi geçmiş izinleri göster
      </label>
    </div>

    <div v-if="loading">Yükleniyor...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="leaves.length === 0">
      Bekleyen izin talebi bulunmamaktadır.
    </div>
    <div v-else>
      <div
        v-for="leave in leaves"
        :key="leave.id"
        class="leave-card"
      >
        <h3>{{ leave.employee.name }}</h3>
        <p>{{ leave.employee.department }}</p>
        <p>
          {{ formatDate(leave.startDate) }} - 
          {{ formatDate(leave.endDate) }}
        </p>
        <p>{{ leave.reason }}</p>
        <button @click="approveLeave(leave)">Onayla</button>
        <button @click="rejectLeave(leave)">Reddet</button>
      </div>

      <div class="pagination">
        <button @click="prevPage" :disabled="page === 1">Önceki</button>
        <span>Sayfa {{ page }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="page === totalPages">Sonraki</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import axios from "axios";

const leaves = ref([]);
const loading = ref(false);
const error = ref<string | null>(null);
const page = ref(1);
const totalPages = ref(1);
const includeExpired = ref(false);

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const fetchLeaves = async () => {
  try {
    loading.value = true;
    error.value = null;
    const token = localStorage.getItem("authToken");
    
    const response = await axios.get(
      `${API_BASE_URL}/employees/any/leaves/pending`,
      {
        params: {
          page: page.value,
          limit: 10,
          includeExpired: includeExpired.value,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    leaves.value = response.data.data.leaves;
    totalPages.value = response.data.data.totalPages;
  } catch (err: any) {
    error.value = err.response?.data?.message || "Hata oluştu";
  } finally {
    loading.value = false;
  }
};

const approveLeave = async (leave: any) => {
  // Onay işlemi
  await fetchLeaves();
};

const rejectLeave = async (leave: any) => {
  // Reddetme işlemi
  await fetchLeaves();
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("tr-TR");
};

const prevPage = () => {
  if (page.value > 1) {
    page.value--;
    fetchLeaves();
  }
};

const nextPage = () => {
  if (page.value < totalPages.value) {
    page.value++;
    fetchLeaves();
  }
};

onMounted(() => {
  fetchLeaves();
});
</script>
```

## 🎨 UI/UX Önerileri

### 1. Durum Göstergeleri
- **Pending (Beklemede):** Sarı/turuncu renk, saat ikonu
- **Approved (Onaylandı):** Yeşil renk, onay işareti ikonu
- **Rejected (Reddedildi):** Kırmızı renk, X ikonu

### 2. Filtreleme ve Sıralama
- İzin tipine göre filtreleme (günlük, yıllık, mazeret)
- Tarihe göre sıralama (en yeni, en eski)
- Employee adına göre arama

### 3. Toplu İşlemler
- Birden fazla izni seçip toplu onaylama/reddetme
- Seçili izinleri Excel'e aktarma

### 4. Bildirimler
- Yeni izin talebi geldiğinde bildirim
- Onay/reddetme işlemlerinden sonra başarı mesajı

## ⚠️ Önemli Notlar

1. **Expired İzinler:** Varsayılan olarak başlangıç tarihi geçmiş pending izinler gösterilmez. `includeExpired=true` parametresi ile gösterilebilir.

2. **Pagination:** Büyük veri setleri için pagination kullanılmalıdır. `limit` parametresi maksimum 100 olabilir.

3. **Real-time Updates:** İzin durumu değiştiğinde liste manuel olarak yenilenmelidir. (WebSocket entegrasyonu gelecekte eklenebilir)

4. **Performance:** Backend paralel sorgular kullanarak optimize edilmiştir. Yine de büyük veri setlerinde pagination önemlidir.

## 🔗 İlgili Endpoint'ler

- **Onay/Reddetme:** `PATCH /employees/:employeeId/leaves/:leaveId/approve`
- **Revize ve Onaylama:** `PATCH /employees/:employeeId/leaves/:leaveId/revise`
- Detaylar için: [leave-approval-rev.md](./leave-approval-rev.md)

## 📞 Destek

Herhangi bir sorunuz veya sorununuz varsa backend ekibiyle iletişime geçebilirsiniz.

