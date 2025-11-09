## Frontend Yol Haritası

Personelim API hâlihazırda kapsamlı bir personel yönetim altyapısı sağlıyor. Aşağıdaki rehber, elimizdeki backend yetenekleriyle nasıl modern, performanslı ve modüler bir frontend (ör. React/Next.js) geliştirebileceğini özetler.

### 1. Temel Bilgiler ve Dokümantasyon
- **Yerel geliştirme URL’i:** `http://localhost:3000`
- **Swagger UI:** `http://localhost:3000/swagger`
- **Redoc:** `http://localhost:3000/api-docs` (kısa yol `/docs`)
- **OpenAPI JSON:** `http://localhost:3000/openapi.json`

> Geliştirmeye başlamadan önce Swagger veya Redoc üzerinden ihtiyaç duyacağın endpoint’in request/response şemasını inceleyebilirsin. Swagger üzerinde `Authorize` butonuyla JWT token’ını girip isteklere hızlıca try-out yap.

### 2. Frontend Teknoloji Seçimleri
- **Framework:** Next.js (SSR ve SEO avantajı) veya SPA için Vite + React.
- **Durum Yönetimi:** Context API + Reducer yapısı veya Redux Toolkit. Kullanıcı oturumu, seçilen işletme vb. global durumlar için uygun.
- **Sunucu Durumu:** React Query veya SWR ile endpoint’leri yönet (cache, refetch, error handling).
- **Form Yönetimi:** React Hook Form + Yup/Zod (örn. giriş, çalışan ekleme).
- **TIP:** İşlevleri parçalara ayır, 300 satırı geçen bileşen bırakma; gerekli yerlerde `useMemo`, `useCallback` ve `React.memo`.

### 3. Kimlik Doğrulama Akışı
1. `/auth/login` ile giriş formu → JWT token döner.
2. Token’ı `httpOnly` çerez veya secure storage’ta tut.
3. Tüm korumalı isteklere `Authorization: Bearer <token>` ekle.
4. Refresh akışı yok; token süresi dolarsa kullanıcıyı yeniden login ekranına yönlendir.
5. Rol bazlı erişim (`owner`, `manager`, `employee`) kontrolünü frontend’de de yap (örn. menü gizleme).

### 3.1 Rol Yetkileri ve Kullanım Senaryoları
- **owner** (varsayılan işletme sahibi)
  - İlk kayıtlı kullanıcı, işletme verilerinin ana sahibi.
  - İşletme bilgilerini, tüm çalışanları ve maaş/mesai verilerini yönetebilir.
  - Gerekirse yeni manager hesapları oluşturacak; çalışanları silme/restore etme yetkisi var.
- **manager**
  - Owner veya admin tarafından yetkilendirilen ikinci seviye yönetici.
  - Çalışan CRUD, timesheet, payroll, leave gibi operasyonların çoğunu owner adına yapabilir.
  - İşletme ayarlarını değiştiremez; kullanıcı rolleri üzerinde sınırlı yetki.
  - Managers hesap oluşturma şu anda backend’de hazır bir endpoint’e bağlı değil; owner Frontend’den çalışanı seçip manager rolüne yükseltecek akışı planlamalı (bkz. [Manager Hesabı Oluşturma](#manager-hesab%C4%B1-olu%C5%9Fturma)).
- **employee**
  - Kendi hesaplarıyla giriş yapar; yalnızca kendisine ait mesai, izin, maaş bilgilerini görüntüler.
  - `/employees/:employeeId/timesheets` üzerinden sadece kendi ID’sini kullanabilir; backend bu kontrolü doğruluyor.
  - Çalışan Self-service aksiyonları: Mesai ekleme/düzenleme, belirli iletişim bilgilerini güncelleme.

> Not: Eski dokümantasyonda **admin** ve **user** rollerinden bahsediyor; backend tarafında hâlâ kullanımda olabilir ama ana akış owner/manager/employee üçlüsü üzerinden kurgulanmalı. UI’de bu roller dışındaki seçenekleri gizle.

### 4. Modüler Sayfa / Bileşen Planı
- **Auth Sayfaları:** Login, Register, Forgot Password (Swagger’daki `auth` endpoint’lerine göre).
- **Dashboard:** `/business` ve `/employees` endpoint’lerini kullanarak genel özet, istatistik kartları.
- **Çalışan Yönetimi:**
  - Liste: `GET /employees`
  - Detay: `GET /employees/:employeeId`
  - Ekle/Güncelle: `POST` & `PUT`
  - Pasifleştirme: `PATCH` veya `DELETE` (Swagger’da ilgili uç noktayı doğrula).
- **İzin (Leave) Yönetimi:** Alt koleksiyon `employees/:employeeId/leaves`; filtreleme için başlangıç/bitiş tarihi kullan.
- **Avanslar:** `/advances` route’u; kullanıcıya form + durum takibi.
- **Timesheet:** `/employees/:id/timesheets`; aylık filtreler ve grafikler için uygundur.
- **Payroll & Maaş Ödemeleri:** İlgili endpoint’lerle bordro görüntüleme, ödeme işaretleme.
- **Sağlık Kontrolü:** `/health` ile backend durumu izleme (örn. monitoring sayfası).

### 5. API Katmanı Önerisi
```ts
// api/client.ts (örnek)
import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

React Query ile kullanım:
```ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export function useEmployees(params) {
  return useQuery({
    queryKey: ["employees", params],
    queryFn: async () => {
      const { data } = await apiClient.get("/employees", { params });
      return data;
    },
    staleTime: 1000 * 60,
  });
}
```

### 6. Hata Yönetimi ve Bildirimler
- Backend global hata cevabı:
  ```json
  {
    "error": "Internal server error",
    "message": "Something went wrong"
  }
  ```
- Frontend tarafında `try/catch` ile yakala, kullanıcıya anlaşılır mesaj göster.
- React Query `onError` veya Axios interceptor ile merkezi hata mekanizması kur.

### 7. Yetkilendirme ve Menü Yönetimi
- Kullanıcı rolünü login cevabından al (`user.role`).
- Menü öğelerini role göre filtrele (örn. `owner` tüm sekmeler, `user` sadece kendi timesheet’i).
- Route guard: Örn. Next.js’de `middleware` veya `getServerSideProps` içinde token doğrulaması.

### 7.1 Manager Hesabı Oluşturma
- Backend’de `POST /auth/register-employee` endpoint’i çalışanlara login hesabı açmak için var; manager rolü için doğrudan endpoint yok.
- Önerilen senaryo:
  1. Owner, yeni yöneticiyi önce normal çalışan olarak ekler (`POST /employees`).
  2. Çalışanın `employeeId`’si alındıktan sonra, owner `POST /auth/register-employee` ile hesap açar.
  3. Ardından owner, `PUT /auth/update` veya özel bir yönetici rol güncelleme endpoint’i üzerinden rolü `manager` olarak günceller (gerekirse backend’e `PUT /auth/users/:uid/role` gibi bir uç eklenmeli).
- FE’de owner paneline “Manager olarak yetkilendir” aksiyonu ekleyip rol değişimini tetikleyen API çağrısını yap.

### 8. SSR / SEO Notları (Next.js için)
- Kimlik doğrulama gerektiren sayfalarda `getServerSideProps` içinde token’ı doğrula; geçersizse login’e yönlendir.
- Ana sayfa, login vb. herkese açık sayfalarda `getStaticProps` + revalidate.
- Meta tag ve `og:image` eklemeyi unutma.

### 9. UI & Performans
- Tailwind CSS veya Styled Components ile tema.
- Büyük listelerde sanal listeleme (`react-window`).
- `React.lazy` + `Suspense` ile modülleri lazy load (örn. grafikli dashboard).
- Form bileşenlerini küçük parçalar halinde tut (örn. `EmployeeForm`, `PayrollForm`).

### 9.1 Timesheet Güvenirliği
- Çalışanların kendi kayıtlarını girmesi güvenlik açısından sorgulanabilir; FE/bE birlikte düşünmeli:
  - Backend tarafında her çalışan kaydı sadece kendi `employeeId`’sine bağlı timesheet oluşturabilir (şu an bu kontrol var).
  - Owner/manager onay akışı gerekiyorsa `timesheets` koleksiyonuna `approved`, `approvedBy`, `approvedAt` alanları ekleyip ekranda onay süreci tasarlanabilir.
  - FE, mesai formunu gönderirken backend’de saat hesabının yapılmasına izin verir; çalışan sadece zamanları girer.
  - Otomatik hesap: Backend `Timesheet.create` içinde check-in/out verildiğinde `totalHoursWorked`’ü hesaplıyor. FE’de hesaplanıp gönderilse bile backend doğrulaması esas olmalı (manipülasyonu önler).
  - Mola süreleri: Şu an modelde explicit mola alanı yok. Mola desteği istiyorsan `breaks` veya `breakMinutes` alanı ekleyip backend’de net çalışma süresini (total - breaks) hesaplat. FE bu alanı isteğe bağlı doldurabilir; nihai hesap backend’e bırakılmalı.

### 9.2 Timesheet Form İpuçları
- Form alanları:
  - `date` (Zorunlu) → `YYYY-MM-DD`
  - `checkInTime`, `checkOutTime` (Opsiyonel; girilirse backend süreyi hesaplar)
  - `status`, `notes`, `overtimeHours`
  - Opsiyonel mola alanı (eklenirse backend’e send)
- FE tarafında tarih seçici + saat seçici kullan; hatalı formatları backend’e göndermeden önce yakala.

### 10. Geliştirme Süreci Önerisi
1. Auth flow (login/register) → token yönetimi.
2. Global state & layout (header, sidebar, rol tabanlı menü).
3. Employee CRUD + React Query cache stratejisi.
4. Leave & Advance modülleri.
5. Timesheet → tarih filtreleri, grafik entegrasyonu.
6. Payroll & Salary → bordro görünümü, ödeme durumu güncellemeleri.
7. Son olarak rapor ekranları ve dashboard kartları.

Bu rehberi büyütmek istersen, her bölüm için component klasör yapısı (örn. `features/employees`, `features/payroll`) veya UI wireframe notları ekleyebilirsin. Yardım gerektiğinde haber ver! 

