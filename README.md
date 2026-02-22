# Personelim API (Backend)

Node.js + Express tabanlı personel yönetimi backend API.
Firebase Admin SDK (Firestore), JWT auth ve `express-validator` ile doğrulama içerir.

## Özellikler

- JWT tabanlı kimlik doğrulama ve rol bazlı yetkilendirme (`owner`, `manager`, `employee`, `admin`)
- İşletme yönetimi
- Personel yönetimi
- İzin, avans, puantaj (timesheet), bordro ve maaş ödeme modülleri
- OpenAPI dokümantasyonu (Redoc)

## Hızlı Başlangıç

```bash
npm install
npm run dev
```

Varsayılan adres:

- API: `https://personelim-be.vercel.app`
- Health: `https://personelim-be.vercel.app/health`
- Dokümantasyon: `https://personelim-be.vercel.app/api-docs`

## Ortam Değişkenleri (.env)

Proje kök dizinine `.env` dosyası oluşturun:

```env
# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=change-me
JWT_EXPIRES_IN=24h

# Firebase
FIREBASE_PROJECT_ID=your-project-id

# Tercih edilen yöntem: Service account JSON'u string olarak
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# Alternatif isim (destekleniyor)
# FIREBASE_SERVICE_ACCOUNT={...}
```

Firebase başlatma davranışı:

- `FIREBASE_SERVICE_ACCOUNT_KEY` veya `FIREBASE_SERVICE_ACCOUNT` varsa bunları kullanır.
- Yoksa kökte `serviceAccountKey.json` dosyası arar.
- O da yoksa default credentials ile deneme yapar.

## Script’ler

- `npm run dev`: Nodemon ile geliştirme
- `npm start`: Production çalıştırma

## API Dokümantasyonu

Uygulama OpenAPI JSON’unu `docs/openapi.json` içinden servis eder:

- Redoc: `GET /api-docs`
- Basit HTML: `GET /api-docs-simple`
- OpenAPI JSON: `GET /openapi.json`
- Kısayol: `GET /docs` → `/api-docs`

Not: Swagger UI için konfig dosyası mevcut olsa da, şu an `src/app.js` içinde Swagger UI route’u mount edilmemiştir.

## Auth

JWT token’ı şu header ile gönderin:

```
Authorization: Bearer <token>
```

## Route Özeti (Base Path’ler)

Uygulama prefix kullanmaz; route’lar doğrudan şu path’lerden başlar:

### Auth (`/auth`)

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `PUT /auth/update`
- `POST /auth/register-employee` (owner/manager)
- `GET /auth/users` (admin)

### Business (`/business`)

- `GET /business/my`
- `PUT /business/my`

### Employees (`/employees`)

- `GET /employees` (owner/manager)
- `GET /employees/:employeeId` (owner/manager)
- `POST /employees` (owner/manager)
- `PUT /employees/:employeeId`
- `DELETE /employees/:employeeId`
- `GET /employees/me`
- `PUT /employees/me`

### Nested modüller

Bu modüller `src/app.js` içinde employeeId param’ı ile mount edilir:

- Leaves: `/employees/:employeeId/leaves`
- Timesheets: `/employees/:employeeId/timesheets`
- Payrolls: `/employees/:employeeId/payrolls`
- Salary Payments: `/employees/:employeeId/salary-payments`

### Advances (`/advances`)

- `POST /advances`
- `GET /advances`
- `PATCH /advances/:employeeId/:advanceId/approve` (owner/manager)
- `PATCH /advances/:employeeId/:advanceId/reject` (owner/manager)

## Proje Yapısı

- `src/app.js`: Express uygulaması (middleware + route mount + docs)
- `src/server.js`: HTTP server (local run) + `module.exports = app` (serverless uyumluluğu)
- `src/config/`: env/firebase/docs konfigleri
- `src/modules/`: modüller (routes → controller → service → schema)
- `src/shared/`: ortak middleware, error handler, firestore yardımcıları
- `docs/openapi.json`: OpenAPI spec
- `postman_collection.json`: Postman koleksiyonu

## Sağlık Kontrolü

`GET /health` her çağrıda Firestore bağlantısını test eder (test dokümanı yaz/sil).
Firestore izinleriniz kapalıysa `firestore: Disconnected` görebilirsiniz.

## Deploy (Vercel notu)

Bu repo’da çalışma entrypoint’i `src/server.js`.
Eğer Vercel kullanacaksanız, `vercel.json` içindeki build `src` alanının `src/server.js`’yi işaret ettiğinden emin olun.

## Lisans

ISC
