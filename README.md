# Personelim API

Gelişmiş bir personel yönetim sistemi için Node.js backend API. Express.js, Firebase Firestore, JWT token'ları ve bcrypt password hashing kullanarak tam kapsamlı bir insan kaynakları çözümü sunar.

## 🚀 Özellikler

### Kimlik Doğrulama ve Yetkilendirme

- **Kullanıcı Kaydı**: İsim, email, şifre ve rol ile yeni kullanıcı kaydı
- **Kullanıcı Girişi**: Email ve şifre ile kimlik doğrulama
- **JWT Authentication**: Güvenli token tabanlı kimlik doğrulama
- **Rol Tabanlı Erişim**: Owner, Manager ve Employee rollerini destekler
- **Şifre Güvenliği**: bcrypt ile güvenli şifre saklama

### İşletme Yönetimi

- **İşletme Profili**: İşletme bilgilerini yönetme
- **Otomatik İşletme Kurulumu**: Owner kaydında otomatik işletme oluşturma

### Personel Yönetimi

- **Personel CRUD**: Tam personel yaşam döngüsü yönetimi
- **Personel Arama**: İsim, email, departman bazlı arama
- **Personel Filtreleme**: Departman, pozisyon gibi kriterlere göre filtreleme
- **Sayfalama**: Büyük veri setleri için sayfalama desteği

### İzin Yönetimi

- **İzin Talepleri**: Günlük, yıllık, mazeret izni talepleri
- **İzin Onay Sistemi**: Manager/Owner onay süreci
- **İzin Takibi**: Personel izin geçmişi ve durumu
- **İzin İstatistikleri**: Departman ve personel bazlı raporlar

### Avans Yönetimi

- **Avans Talepleri**: Personel avans talep sistemi
- **Avans Onay Süreci**: Manager/Owner onay sistemi
- **Avans Takibi**: Avans geçmişi ve geri ödeme takibi
- **Avans Raporları**: İstatistiksel raporlar

### Puantaj Sistemi

- **Çalışma Saatleri**: Günlük çalışma saati kayıtları
- **Mesai Takibi**: Normal ve fazla mesai hesaplamaları
- **Puantaj Raporları**: Aylık ve dönemsel puantaj raporları
- **Otomatik Hesaplamalar**: Toplam çalışma saati hesaplamaları

### Bordro Sistemi

- **Bordro Oluşturma**: Aylık bordro hesaplamaları
- **Maaş Hesaplamaları**: Temel maaş, mesai, kesinti hesaplamaları
- **Bordro Raporları**: Detaylı bordro raporları
- **PDF Export**: Bordro PDF çıktısı (gelecek özellik)

### Maaş Ödeme Yönetimi

- **Ödeme Kayıtları**: Maaş ödeme takibi
- **Ödeme Durumu**: Ödenen/bekleyen ödemeler
- **Ödeme Geçmişi**: Personel ödeme geçmişi
- **Ödeme Raporları**: Finansal raporlar

### Güvenlik ve Performans

- **CORS Desteği**: Cross-origin resource sharing
- **Helmet Güvenlik**: HTTP header güvenliği
- **Input Validasyonu**: Kapsamlı giriş validasyonu
- **Hata Yönetimi**: Detaylı hata mesajları ve logları
- **Firebase Firestore**: Bulut tabanlı NoSQL veritabanı

## 📚 API Dokümantasyonu

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase project with Firestore enabled
- Firebase Admin SDK service account key

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd personelim
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Configure your `.env` file with your Firebase credentials and other settings.

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Generate a service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Add the JSON content to your `.env` file as `FIREBASE_SERVICE_ACCOUNT_KEY`

## Usage

### Development

Start the development server with auto-reload:

```bash
npm run dev
```

### Production

Start the production server:

```bash
npm start
```

The API will be available at `http://localhost:3000`

## API Documentation

### Swagger/OpenAPI Documentation

Interactive API documentation is available via Swagger UI:

- **Main Documentation**: `http://localhost:3000/api-docs`
- **Quick Access**: `http://localhost:3000/docs` (redirects to api-docs)

The Swagger documentation includes:

- Complete endpoint specifications with request/response schemas
- Interactive testing interface for all endpoints
- Authentication examples with JWT token support
- Model definitions and validation rules
- Example requests and responses

### Testing the API

You can test the API using:

1. **Swagger UI**: Interactive web interface at `/api-docs`
2. **Postman Collection**: Import the provided `postman_collection.json`
3. **curl commands**: Examples provided below
4. **Any HTTP client**: Use the OpenAPI specification

## API Endpoints

### Authentication

#### Register Business Owner (Creates Business Automatically)

- **POST** `/api/auth/register`
- **Description**: Creates a new user account and automatically sets up a business for them
- **Body**:

```json
{
  "name": "Business Owner",
  "email": "owner@example.com",
  "password": "Password123"
}
```

- **Response**: Returns user info, business info, and JWT token
- **Note**: User role is automatically set to "owner" and a business is created

#### Register Employee User

- **POST** `/api/auth/register-employee`
- **Headers**: `Authorization: Bearer <jwt-token>` (Owner/Manager only)
- **Description**: Creates a user account for an existing employee
- **Body**:

```json
{
  "employeeId": "employee-document-id",
  "email": "employee@example.com",
  "password": "SecurePass123"
}
```

- **Note**: Only business owners and managers can create employee users

#### Login User

- **POST** `/api/auth/login`
- **Body**:

```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

#### Get Current User

- **GET** `/api/auth/me`
- **Headers**: `Authorization: Bearer <jwt-token>`

### Employee Management

#### Get All Employees (Owner/Manager Only)

- **GET** `/api/employees`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
  - `search` (optional): Search by name, email, or TC Kimlik No
  - `department` (optional): Filter by department

#### Get My Employee Data (Employee Only)

- **GET** `/api/employees/me`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Employees can view their own data

#### Update My Employee Data (Employee Only)

- **PUT** `/api/employees/me`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Employees can update limited fields (phone, address, profile picture)
- **Body**:

```json
{
  "phoneNumber": "+905551234567",
  "address": "New address",
  "profilePictureUrl": "https://example.com/photo.jpg"
}
```

#### Get My Leaves (Employee Only)

- **GET** `/api/employees/me/leaves`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Query Parameters**:
  - `page`, `limit`, `status`, `type`

#### Create Leave Request (Employee Only)

- **POST** `/api/employees/me/leaves`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Body**:

```json
{
  "type": "yıllık",
  "startDate": "2024-12-20",
  "endDate": "2024-12-25",
  "reason": "Annual vacation"
}
```

#### Get Own Advance Requests (Employee Only)

- **GET** `/api/employees/me/advances`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Query Parameters**:
  - `page`, `limit`, `status`

#### Create Advance Request (Employee Only)

- **POST** `/api/employees/me/advances`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Body**:

```json
{
  "amount": 5000.5,
  "reason": "Emergency expense advance request"
}
```

#### Get Employee by ID (Owner/Manager Only)

- **GET** `/api/employees/:employeeId`
- **Headers**: `Authorization: Bearer <jwt-token>`

#### Create New Employee (Owner/Manager Only)

- **POST** `/api/employees`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Body**:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "phoneNumber": "+905551234567",
  "tcKimlikNo": "12345678901",
  "dateOfBirth": "1990-01-15T00:00:00.000Z",
  "gender": "Male",
  "address": "Istanbul, Turkey",
  "position": "Software Developer",
  "department": "IT",
  "contractType": "Belirsiz Süreli",
  "workingHoursPerDay": 8,
  "startDate": "2024-01-01T00:00:00.000Z",
  "salary": {
    "grossAmount": 50000,
    "netAmount": 38000,
    "currency": "TL",
    "bankName": "Ziraat Bankası",
    "iban": "TR123456789012345678901234"
  },
  "insuranceInfo": {
    "sicilNo": "123456789",
    "startDate": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update Employee

- **PUT** `/api/employees/:employeeId`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Body**: Same as create employee (partial updates allowed)

#### Delete Employee (Soft Delete)

- **DELETE** `/api/employees/:employeeId`
- **Headers**: `Authorization: Bearer <jwt-token>`

#### Restore Deleted Employee

- **POST** `/api/employees/:employeeId/restore`
- **Headers**: `Authorization: Bearer <jwt-token>`

#### Get Deleted Employees

- **GET** `/api/employees/deleted`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)

#### Get Employee Statistics

- **GET** `/api/employees/statistics`
- **Headers**: `Authorization: Bearer <jwt-token>`

### Business Management

#### Get My Business

- **GET** `/api/business/my`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Get current user's business information

#### Update My Business

- **PUT** `/api/business/my`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Body**:

```json
{
  "name": "Updated Business Name",
  "address": "Business Address",
  "phone": "+905551234567",
  "email": "business@example.com",
  "logoUrl": "https://example.com/logo.png"
}
```

#### Get Business by ID

- **GET** `/api/business/:businessId`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Get business information by ID (for future features)

### Leave Management

#### Create Employee Leave (Employee/Owner/Manager)

- **POST** `/api/employees/:employeeId/leaves`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Employees can only create leaves for themselves, owners/managers for any employee
- **Body**:

```json
{
  "type": "yıllık", // "günlük", "yıllık", "mazeret"
  "startDate": "2024-12-20",
  "endDate": "2024-12-25",
  "reason": "Yılbaşı tatili"
}
```

**Note**: Employee-created leaves are automatically set to "pending" status.

#### Get Employee Leaves (Employee/Owner/Manager)

- **GET** `/api/employees/:employeeId/leaves`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Employees can only view their own leaves
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Results per page (default: 10)
  - `status` (optional): Filter by status ("pending", "approved", "rejected")
  - `approved` (optional): Filter by approval status (true/false) - backward compatibility
  - `type` (optional): Filter by leave type

#### Approve/Reject Employee Leave (Owner/Manager Only)

- **PATCH** `/api/employees/:employeeId/leaves/:leaveId/approve`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Only available for business owners and managers
- **Body**:

```json
{
  "status": "approved", // "approved" or "rejected"
  "approvalNote": "Onaylandı"
}
```

#### Update Employee Leave (Limited Access)

- **PUT** `/api/employees/:employeeId/leaves/:leaveId`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Employees can only update their own pending leaves
- **Body**:

```json
{
  "type": "mazeret",
  "startDate": "2024-12-20",
  "endDate": "2024-12-22",
  "reason": "Doktor randevusu"
}
```

#### Delete Employee Leave (Limited Access)

- **DELETE** `/api/employees/:employeeId/leaves/:leaveId`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Employees can only delete their own pending leaves

#### Get Employee Leave Statistics

- **GET** `/api/employees/:employeeId/leaves/statistics`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Get leave statistics for an employee

### Advance Request Management

#### Create Advance Request (Employee/Owner/Manager)

- **POST** `/api/advances`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Employees can only create advance requests for themselves, owners/managers for any employee
- **Body**:

```json
{
  "amount": 5000.5,
  "reason": "Acil masraf için avans talebi",
  "employeeId": "employee-id" // Optional: Only for owners/managers
}
```

**Note**: Employee-created advance requests are automatically set to "pending" status.

#### Get Advance Requests (Employee/Owner/Manager)

- **GET** `/api/advances`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Employees can only view their own advance requests
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Results per page (default: 10)
  - `status` (optional): Filter by status ("pending", "approved", "rejected")
  - `employeeId` (optional): Specific employee ID (owner/manager only)

#### Get Specific Advance Request

- **GET** `/api/advances/:employeeId/:advanceId`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Get specific advance request details

#### Update Advance Request (Limited Access)

- **PUT** `/api/advances/:employeeId/:advanceId`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Employees can only update their own pending advance requests
- **Body**:

```json
{
  "amount": 3000.0,
  "reason": "Güncellenmiş avans talebi"
}
```

#### Approve Advance Request (Owner/Manager Only)

- **PATCH** `/api/advances/:employeeId/:advanceId/approve`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Only available for business owners and managers
- **Body**:

```json
{
  "approvalNote": "Onaylandı"
}
```

#### Reject Advance Request (Owner/Manager Only)

- **PATCH** `/api/advances/:employeeId/:advanceId/reject`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Only available for business owners and managers
- **Body**:

```json
{
  "approvalNote": "Red nedeni: Bütçe yetersizliği"
}
```

#### Delete Advance Request (Limited Access)

- **DELETE** `/api/advances/:employeeId/:advanceId`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Employees can only delete their own pending advance requests

#### Get Advance Request Statistics

- **GET** `/api/advances/statistics/:employeeId?`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Get advance request statistics
- **Query Parameters**:
  - `year` (optional): Year for statistics (default: current year)

### Timesheet Management (Puantaj)

#### Create Timesheet

- **POST** `/api/employees/:employeeId/timesheets`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Description**: Employees can create for themselves, owners/managers for any employee
- **Body**:

```json
{
  "date": "2025-07-07",
  "status": "Çalıştı",
  "checkInTime": "09:00",
  "checkOutTime": "17:00",
  "overtimeHours": 1.5,
  "notes": "Extra overtime for project deadline"
}
```

#### Get Timesheets

- **GET** `/api/employees/:employeeId/timesheets`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Query Parameters**:
  - `month` (optional): Month filter (1-12)
  - `year` (optional): Year filter
  - `status` (optional): Status filter
  - `page`, `limit`: Pagination

#### Update Timesheet

- **PUT** `/api/employees/:employeeId/timesheets/:timesheetId`
- **Headers**: `Authorization: Bearer <jwt-token>`

#### Delete Timesheet

- **DELETE** `/api/employees/:employeeId/timesheets/:timesheetId`
- **Headers**: `Authorization: Bearer <jwt-token>`

#### Get Timesheet Statistics

- **GET** `/api/employees/:employeeId/timesheets/statistics`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Query Parameters**:
  - `month`, `year`: Filter options

### Payroll Management (Bordro)

#### Create Payroll (Owner/Manager Only)

- **POST** `/api/employees/:employeeId/payrolls`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Body**:

```json
{
  "periodMonth": "07",
  "periodYear": "2025",
  "grossSalary": 15000.0,
  "totalDeductions": 3000.0,
  "insurancePremiumEmployeeShare": 1500.0,
  "insurancePremiumEmployerShare": 2000.0,
  "taxDeduction": 1500.0,
  "otherAdditions": 500.0,
  "currency": "TL"
}
```

#### Get Payrolls

- **GET** `/api/employees/:employeeId/payrolls`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Query Parameters**:
  - `year`, `status`, `page`, `limit`

#### Get Specific Payroll

- **GET** `/api/employees/:employeeId/payrolls/:payrollId`
- **Headers**: `Authorization: Bearer <jwt-token>`

#### Mark Payroll as Paid (Owner/Manager Only)

- **PATCH** `/api/employees/:employeeId/payrolls/:payrollId/pay`
- **Headers**: `Authorization: Bearer <jwt-token>`

#### Get Payroll Statistics

- **GET** `/api/employees/:employeeId/payrolls/statistics`
- **Headers**: `Authorization: Bearer <jwt-token>`

### Salary Payment Management (Maaş Ödemesi)

#### Create Salary Payment (Owner/Manager Only)

- **POST** `/api/employees/:employeeId/salary-payments`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Body**:

```json
{
  "amount": 12000.0,
  "payrollId": "payroll-id-here",
  "paymentMethod": "Banka Havalesi",
  "description": "July 2025 salary payment",
  "currency": "TL"
}
```

#### Get Salary Payments

- **GET** `/api/employees/:employeeId/salary-payments`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Query Parameters**:
  - `year`, `paymentMethod`, `startDate`, `endDate`, `page`, `limit`

#### Get Salary Payment Statistics

- **GET** `/api/employees/:employeeId/salary-payments/statistics`
- **Headers**: `Authorization: Bearer <jwt-token>`

#### Get Salary Payments by Payroll

- **GET** `/api/employees/:employeeId/salary-payments/by-payroll/:payrollId`
- **Headers**: `Authorization: Bearer <jwt-token>`

### Health Check

- **GET** `/api/health`

## Response Format

### Success Response

```json
{
  "message": "Success message",
  "user": {
    "uid": "user-id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2025-07-05T10:00:00.000Z"
  },
  "token": "jwt-token"
}
```

### Error Response

```json
{
  "error": "Error type",
  "message": "Error description",
  "details": []
}
```

## Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: Secure token-based authentication
- **Input Validation**: Express-validator for request validation
- **CORS**: Cross-origin resource sharing protection
- **Helmet**: Security headers
- **Role-based Access**: Admin and user role separation

## Database Schema

### Users Collection (Firestore)

```javascript
{
  "name": "string",
  "email": "string (unique)",
  "password": "string (hashed)",
  "role": "owner" | "admin" | "user",
  "businessId": "string (reference to businesses collection)",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp",
  "lastLogin": "ISO 8601 timestamp",
  "isActive": "boolean",
  "deletedAt": "ISO 8601 timestamp (optional)"
}
```

### Businesses Collection (Firestore)

```javascript
{
  "name": "string",
  "address": "string",
  "phone": "string",
  "email": "string",
  "logoUrl": "string (default: icon URL)",
  "ownerId": "string (reference to users collection)",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp"
}
```

### Employees Sub-collection (Firestore)

Located at: `users/{userId}/employees/{employeeId}`

```javascript
{
  "userId": "string",
  "employeeCode": "string (optional)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "profilePictureUrl": "string (optional)",
  "email": "string (optional)",
  "phoneNumber": "string (optional)",
  "tcKimlikNo": "string (optional, unique per user)",
  "dateOfBirth": "ISO 8601 timestamp (optional)",
  "gender": "string (optional)",
  "address": "string (optional)",
  "position": "string (optional)",
  "department": "string (optional)",
  "contractType": "Belirsiz Süreli" | "Belirli Süreli" | "Part-time" | "Stajyer",
  "workingHoursPerDay": "number (default: 8)",
  "startDate": "ISO 8601 timestamp (optional)",
  "terminationDate": "ISO 8601 timestamp (optional)",
  "salary": {
    "grossAmount": "number",
    "netAmount": "number",
    "currency": "TL" | "USD" | "EUR",
    "bankName": "string (optional)",
    "iban": "string (optional)"
  },
  "insuranceInfo": {
    "sicilNo": "string (optional)",
    "startDate": "ISO 8601 timestamp (optional)"
  },
  "isActive": "boolean (default: true)",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp",
  "deletedAt": "ISO 8601 timestamp (optional)"
}
```

### Leaves Sub-collection (Firestore)

Located at: `users/{userId}/employees/{employeeId}/leaves/{leaveId}`

```javascript
{
  "userId": "string",
  "employeeId": "string",
  "type": "günlük" | "yıllık" | "mazeret",
  "startDate": "ISO 8601 timestamp",
  "endDate": "ISO 8601 timestamp",
  "totalDays": "number (calculated)",
  "reason": "string (optional)",
  "approved": "boolean (default: false)",
  "approvedBy": "string (optional, user ID)",
  "approvedAt": "ISO 8601 timestamp (optional)",
  "approvalNote": "string (optional)",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp"
}
```

## Error Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors, user exists, invalid credentials)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

## Development

### Project Structure

```
personelim/
├── config/
│   └── firebase.js          # Firebase configuration
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   └── auth.js              # Authentication routes
├── .env                     # Environment variables
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── package.json             # Project dependencies
├── server.js                # Main server file
└── README.md                # This file
```

### Adding New Routes

1. Create a new route file in the `routes/` directory
2. Import and use the authentication middleware for protected routes
3. Add the route to `server.js`

### Adding New Middleware

1. Create middleware in the `middleware/` directory
2. Export the middleware function
3. Import and use in routes or globally in `server.js`

## License

ISC

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
