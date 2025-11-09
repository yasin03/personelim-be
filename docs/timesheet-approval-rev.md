## Timesheet Onay Revizyonu

Bu doküman yalnızca son backend revizyonlarını özetler ve frontend ekibine entegrasyon için rehberlik eder.

### 1. Timesheet Modelindeki Yeni Alanlar
- `approvalStatus`: `"pending" | "approved" | "rejected"` (varsayılan `"pending"`).
- `approvalNote`: Onay/reddetme sırasında bırakılan açıklama (opsiyonel).
- `approvedBy`: Onayı veren kullanıcının UID’si (yalnızca `approved` veya `rejected` durumlarında dolar).
- `approvedAt`: Onay zaman damgası (ISO8601).

Tüm listeleme ve tekil sorgular bu alanları döndürür. Timesheet oluşturulurken veya güncellenirken bu alanlar FE’den gelse bile backend tarafından görmezden gelinir.

### 2. Yeni Endpoint
```
PATCH /employees/:employeeId/timesheets/:timesheetId/approve
```

- **Yetki:** `owner` ve `manager`.
- **Body:**
  ```json
  {
    "status": "approved",
    "note": "Opsiyonel açıklama"
  }
  ```
- `status` değeri `Timesheet.getApprovalStatuses()` ile tanımlı (şu an `pending`, `approved`, `rejected`).
- `note` alanı opsiyoneldir, max 1000 karakter.
- Başarılı yanıt: Güncellenmiş timesheet nesnesi.

### 3. Yetkilendirme ve Bağlam
- Manager hesapları artık kendi `businessId` değerlerinden owner UID’sine ulaşıyor; böylece `employees` alt koleksiyonuna erişip onay verebiliyor.
- Employee rolü yalnızca kendi kaydı için işlem yapabilir; başka bir employeeId ile istek atarsa `403 Forbidden`.
- Onay endpointi employee kullanıcılarına kapalı (middleware `isManagerOrOwner`).

### 4. FE İçin Akış Notları
- Timesheet oluşturma/düzenleme formlarında onay alanları gösterilmemeli; backend bunları kabul etmiyor.
- Yeni alanlar listede görüntülenebilir:
  - `approvalStatus` renk/ikon ile sunulabilir.
  - `approvedBy` uid’si için gerekli ise kullanıcı lookup yapılmalı (opsiyonel).
  - `approvedAt` zaman damgası formatlanabilir.
- Onay butonunun çağıracağı payload örneği:
  ```ts
  await apiClient.patch(
    `/employees/${employeeId}/timesheets/${timesheetId}/approve`,
    { status: "approved", note }
  );
  ```
- Reddetme için `status: "rejected"` kullanılır; not alanı özellikle reddetme sebebini taşımak için önerilir.
- Onayı geri almak istenirse `status: "pending"` gönderilebilir; bu durumda onaycı ve tarih sıfırlanır.

### 5. Hata Mesajları
- Yetki ihlali: `403 Forbidden` + açıklayıcı mesaj.
- Timesheet/employee bulunamazsa `404 Not Found`.
- Geçersiz `status` veya hatalı inputta `400 Validation Error`.
- Diğer durumlarda `500 Internal Server Error`.

Herhangi bir soruda backend ekibiyle iletişime geçebilirsiniz. !*** End Patch

