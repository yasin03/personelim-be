## İzin Onay Revizyonu

Bu doküman yalnızca son backend revizyonlarını özetler ve frontend ekibine entegrasyon için rehberlik eder.

**📖 Detaylı Frontend Entegrasyon Rehberi için:** [leave-pending-guide.md](./leave-pending-guide.md) dosyasına bakın.

### 1. Leave Modelindeki Alanlar

- `status`: `"pending" | "approved" | "rejected"` (varsayılan `"pending"`).
- `approvalNote`: Onay/reddetme sırasında bırakılan açıklama (opsiyonel, max 1000 karakter).
- `approvedBy`: Onayı veren kullanıcının UID'si (yalnızca `approved` veya `rejected` durumlarında dolar).
- `approvedAt`: Onay zaman damgası (ISO8601).
- `approved`: Boolean (backward compatibility için, `status === "approved"` ile aynı).

Tüm listeleme ve tekil sorgular bu alanları döndürür. Leave oluşturulurken veya güncellenirken bu alanlar FE'den gelse bile backend tarafından görmezden gelinir (employee için).

### 2. Yeni/Güncellenmiş Endpoint'ler

#### 2.1. Tüm İzinleri Listeleme Endpoint'i (Yeni)

```
GET /employees/:employeeId/leaves/all
```

**Not:** `employeeId` parametresi route'da bulunur ancak kullanılmaz; tüm employee'lerin tüm izinleri döner.

- **Yetki:** `owner` ve `manager`.
- **Query Parameters:**
  - `page` (opsiyonel): Sayfa numarası (varsayılan: 1)
  - `limit` (opsiyonel): Sayfa başına kayıt sayısı (varsayılan: 10, max: 100)
  - `status` (opsiyonel): İzin durumuna göre filtreleme (`pending`, `approved`, `rejected`)
  - `type` (opsiyonel): İzin tipine göre filtreleme (`günlük`, `yıllık`, `mazeret`)
  - `includeExpired` (opsiyonel): Süresi geçmiş pending izinleri dahil et (varsayılan: false)
- **Açıklama:** Tüm employee'lerin tüm izin taleplerini listeler (pending, approved, rejected). Her izin için employee bilgileri de döner.
- **Kullanım Örnekleri:**
  - Tüm izinler: `GET /employees/any/leaves/all`
  - Sadece onaylanmış: `GET /employees/any/leaves/all?status=approved`
  - Sadece yıllık izinler: `GET /employees/any/leaves/all?type=yıllık`
  - Onaylanmış yıllık izinler: `GET /employees/any/leaves/all?status=approved&type=yıllık`

#### 2.2. Bekleyen İzinleri Listeleme Endpoint'i (Yeni)

```
GET /employees/:employeeId/leaves/pending
```

**Not:** `employeeId` parametresi route'da bulunur ancak kullanılmaz; tüm employee'lerin bekleyen izinleri döner.

- **Yetki:** `owner` ve `manager`.
- **Query Parameters:**
  - `page` (opsiyonel): Sayfa numarası (varsayılan: 1)
  - `limit` (opsiyonel): Sayfa başına kayıt sayısı (varsayılan: 10, max: 100)
  - `includeExpired` (opsiyonel): Süresi geçmiş pending izinleri dahil et (varsayılan: false)
- **Açıklama:** Tüm employee'lerin bekleyen (pending) izin taleplerini listeler. Her izin için employee bilgileri de döner.
- **Yanıt Örneği:**
  ```json
  {
    "message": "Pending leaves retrieved successfully",
    "data": {
      "leaves": [
        {
          "id": "leave-id",
          "employeeId": "employee-id",
          "type": "yıllık",
          "startDate": "2024-12-20",
          "endDate": "2024-12-25",
          "reason": "Tatil",
          "status": "pending",
          "createdAt": "2024-12-15T10:00:00.000Z",
          "employee": {
            "id": "employee-id",
            "firstName": "Ahmet",
            "lastName": "Yılmaz",
            "name": "Ahmet Yılmaz",
            "email": "ahmet@example.com",
            "department": "IT",
            "position": "Developer"
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
- **Notlar:**
  - Varsayılan olarak süresi geçmiş pending izinler filtrelenir.
  - İzinler oluşturulma tarihine göre yeni → eski sıralanır.
  - Manager'lar için businessId üzerinden owner UID'si çözümlenir.

#### 2.3. Onay/Reddetme Endpoint'i (Güncellendi)

```
PATCH /employees/:employeeId/leaves/:leaveId/approve
```

- **Yetki:** `owner` ve `manager`.
- **Body:**
  ```json
  {
    "status": "approved",  // "pending", "approved", veya "rejected"
    "note": "Opsiyonel açıklama"
  }
  ```
- `status` değeri `Leave.getApprovalStatuses()` ile tanımlı (şu an `pending`, `approved`, `rejected`).
- `note` alanı opsiyoneldir, max 1000 karakter.
- `status: "pending"` gönderilirse onay durumu sıfırlanır (onaycı ve tarih null olur).
- Başarılı yanıt: Güncellenmiş leave nesnesi.

#### 2.4. Revize ve Onaylama Endpoint'i (Yeni)

```
PATCH /employees/:employeeId/leaves/:leaveId/revise
```

- **Yetki:** `owner` ve `manager`.
- **Body:**
  ```json
  {
    "type": "yıllık",  // Opsiyonel: "günlük", "yıllık", "mazeret"
    "startDate": "2024-12-20",  // Opsiyonel: YYYY-MM-DD
    "endDate": "2024-12-25",  // Opsiyonel: YYYY-MM-DD
    "reason": "Revize edilmiş açıklama",  // Opsiyonel, max 500 karakter
    "status": "approved",  // Opsiyonel: "pending", "approved", "rejected"
    "note": "Revize edip onayladım"  // Opsiyonel, max 1000 karakter
  }
  ```
- Owner/Manager herhangi bir leave'i revize edebilir (tarih, tip, açıklama değiştirebilir).
- Eğer `status` gönderilirse, revize işleminden sonra otomatik olarak onay durumu güncellenir.
- Tüm alanlar opsiyoneldir; sadece gönderilen alanlar güncellenir.
- Başarılı yanıt: Güncellenmiş leave nesnesi.

### 3. Yetkilendirme ve Bağlam

- Manager hesapları artık kendi `businessId` değerlerinden owner UID'sine ulaşıyor; böylece `employees` alt koleksiyonuna erişip onay verebiliyor.
- Employee rolü yalnızca kendi kaydı için işlem yapabilir; başka bir employeeId ile istek atarsa `403 Forbidden`.
- Onay ve revize endpoint'leri employee kullanıcılarına kapalı (middleware `isManagerOrOwner`).

### 4. Expired (Süresi Geçmiş) İzinler

- Başlangıç tarihi geçmiş ve `status: "pending"` olan izinler varsayılan olarak listeleme sonuçlarından filtrelenir.
- Expired izinleri görmek için query parametresi: `?includeExpired=true`
- Expired kontrolü yalnızca `pending` durumundaki izinler için yapılır; `approved` veya `rejected` izinler her zaman gösterilir.

### 5. FE İçin Akış Notları

#### 5.1. İzin Listeleme

- **Bekleyen İzinleri Getirme (Owner/Manager):**
  ```ts
  // Tüm bekleyen izinleri getir (expired hariç)
  const response = await apiClient.get(
    `/employees/any/leaves/pending?page=1&limit=10`
  );
  
  // Expired izinleri de dahil et
  const responseWithExpired = await apiClient.get(
    `/employees/any/leaves/pending?page=1&limit=10&includeExpired=true`
  );
  
  // Her izin için employee bilgisi de döner
  response.data.leaves.forEach(leave => {
    console.log(leave.employee.name); // Employee adı
    console.log(leave.employee.department); // Department
  });
  ```

- İzin listelerinde expired pending izinler varsayılan olarak gösterilmez.
- Eğer tüm izinleri (expired dahil) görmek istenirse: `?includeExpired=true` parametresi eklenmelidir.
- `status` alanı renk/ikon ile sunulabilir:
  - `pending`: Beklemede (sarı/turuncu)
  - `approved`: Onaylandı (yeşil)
  - `rejected`: Reddedildi (kırmızı)

#### 5.2. İzin Oluşturma/Düzenleme

- Employee'ler yalnızca `pending` durumunda izin oluşturabilir/düzenleyebilir.
- Owner/Manager herhangi bir izni düzenleyebilir; ancak onaylanmış/reddedilmiş bir izni düzenlerse otomatik olarak `pending` durumuna döner.

#### 5.3. Onay İşlemleri

- Onay butonunun çağıracağı payload örneği:
  ```ts
  await apiClient.patch(
    `/employees/${employeeId}/leaves/${leaveId}/approve`,
    { status: "approved", note: "Onaylandı" }
  );
  ```
- Reddetme için `status: "rejected"` kullanılır.
- Onayı geri almak istenirse `status: "pending"` gönderilebilir; bu durumda onaycı ve tarih sıfırlanır.

#### 5.4. Revize İşlemi

- Owner/Manager bir izni revize edip aynı anda onaylayabilir:
  ```ts
  await apiClient.patch(
    `/employees/${employeeId}/leaves/${leaveId}/revise`,
    {
      startDate: "2024-12-20",
      endDate: "2024-12-25",
      reason: "Revize edilmiş açıklama",
      status: "approved",
      note: "Tarihleri düzelttim ve onayladım"
    }
  );
  ```
- Sadece revize etmek için (onaylamadan):
  ```ts
  await apiClient.patch(
    `/employees/${employeeId}/leaves/${leaveId}/revise`,
    {
      startDate: "2024-12-20",
      endDate: "2024-12-25"
    }
  );
  ```

### 6. Hata Mesajları

- Yetki ihlali: `403 Forbidden` + açıklayıcı mesaj.
- Leave/employee bulunamazsa `404 Not Found`.
- Geçersiz `status` veya hatalı inputta `400 Validation Error`.
- Expired izinler için özel bir hata yok; sadece listeleme sonuçlarından filtrelenir.
- Diğer durumlarda `500 Internal Server Error`.

### 7. Önemli Notlar

- Employee'ler yalnızca kendi `pending` izinlerini düzenleyebilir/silebilir.
- Owner/Manager herhangi bir izni revize edebilir ve onaylayabilir.
- Başlangıç tarihi geçmiş `pending` izinler varsayılan olarak listeleme sonuçlarından çıkarılır.
- `approved` ve `rejected` izinler her zaman gösterilir (expired olsa bile).

Herhangi bir soruda backend ekibiyle iletişime geçebilirsiniz.

