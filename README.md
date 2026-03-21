# Banisa - Medical Services Platform

A comprehensive medical services platform for managing clinics, diagnostic services, surgical procedures, sanatorium services, and patient appointments in Uzbekistan.

## 🏗️ Project Structure

```
banisa/
├── backend/          # Node.js + Express + TypeScript backend
│   ├── src/
│   │   ├── modules/  # Feature modules
│   │   │   ├── auth/           # Authentication & authorization
│   │   │   ├── user/           # User profile & patient operations
│   │   │   ├── admin/          # Super admin operations
│   │   │   ├── clinic/         # Clinic admin operations
│   │   │   ├── clinics/        # Clinic management
│   │   │   ├── categories/     # Service categories
│   │   │   ├── diagnostics/    # Diagnostic services
│   │   │   ├── surgical/       # Surgical services
│   │   │   ├── sanatorium/     # Sanatorium services
│   │   │   ├── checkup-packages/ # Health checkup packages
│   │   │   └── reviews/        # Clinic reviews
│   │   ├── config/   # Configuration files
│   │   ├── middleware/ # Express middleware
│   │   └── utils/    # Utility functions
│   └── prisma/       # Database schema & migrations
│
└── code/             # React + Vite frontend
    ├── src/
    │   ├── admin/    # Super admin dashboard
    │   ├── clinic/   # Clinic admin dashboard
    │   ├── pages/    # Public pages
    │   ├── components/ # Shared components
    │   └── shared/   # Shared utilities
    └── public/       # Static assets
```

## 🚀 Features

### For Super Admin
- ✅ Manage service categories (diagnostics, surgical, sanatorium)
- ✅ Create and manage all types of services
- ✅ Review and approve clinic registrations
- ✅ Manage checkup packages
- ✅ Monitor platform analytics

### For Clinic Admin
- ✅ Complete clinic profile management
- ✅ Activate/deactivate services with custom pricing
- ✅ Comprehensive sanatorium service activation (room details, meal plans, amenities, location, etc.)
- ✅ Manage appointments and bookings
- ✅ Staff management
- ✅ Working hours and queue settings
- ✅ Service customization with images
- ✅ Discount management
- ✅ Creative dashboard with real-time analytics

### For Patients
- ✅ Browse clinics and services
- ✅ Book appointments
- ✅ View appointment history
- ✅ Leave reviews and ratings
- ✅ Manage profile

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + HttpOnly cookies
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate limiting
- **File Upload**: Multer + Cloudinary

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **HTTP Client**: Axios

## 📦 Installation

### Prerequisites
- Node.js 16+ 
- PostgreSQL 14+
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets

# Run database migrations
npx prisma migrate dev

# Seed database (optional)
npx ts-node prisma/seed.ts

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd code

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your backend API URL

# Start development server
npm run dev
```

## 🔐 Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/banisa_db"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
CORS_ORIGIN="http://localhost:5173"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## 🗄️ Database Schema

### User Roles
- `SUPER_ADMIN` - Platform administrator
- `CLINIC_ADMIN` - Clinic owner/manager
- `PATIENT` - Regular user
- `PENDING_CLINIC` - Clinic registration pending approval

### Main Models
- **User** - User accounts with role-based access
- **Clinic** - Medical facilities
- **ServiceCategory** - Hierarchical service categories (3 levels)
- **DiagnosticService** - Laboratory and diagnostic tests
- **SurgicalService** - Surgical procedures
- **SanatoriumService** - Sanatorium/spa services
- **CheckupPackage** - Health checkup bundles
- **Appointment** - Patient bookings
- **Review** - Clinic ratings and reviews

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### User (Patient)
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/appointments` - Get user appointments
- `GET /api/user/reviews` - Get user reviews
- `POST /api/user/reviews` - Create review

### Clinic Admin
- `GET /api/clinic/stats` - Dashboard statistics
- `GET /api/clinic/services/available` - Available services
- `POST /api/clinic/services/activate` - Activate service
- `GET /api/clinic/bookings` - Clinic bookings
- `GET /api/clinic/staff` - Staff management
- `PUT /api/clinic/settings/working-hours` - Update hours

### Super Admin
- `GET /api/admin/clinics` - All clinics
- `POST /api/diagnostics` - Create diagnostic service
- `POST /api/surgical` - Create surgical service
- `POST /api/sanatorium` - Create sanatorium service

## 🎨 UI Features

### Clinic Dashboard
- Real-time statistics with animated cards
- Weekly trend charts (appointments, revenue)
- Appointment status breakdown (donut chart)
- Recent appointments list with avatars
- Service type breakdown
- Top doctors ranking
- Review statistics with star ratings
- Quick action navigation cards

### Sanatorium Service Activation
Comprehensive form with:
- Basic info (custom name, description)
- Pricing & discount (with expiry date)
- Room details (type, capacity, images, amenities)
- Meal plan selection
- Location & contact info
- Additional features (pool, sauna, etc.)
- Included/excluded items

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd code
npm test
```

## 📝 Code Quality

- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Zod** for runtime validation
- **Clean architecture** with separation of concerns
- **Comprehensive error handling**
- **Security best practices** (JWT, CORS, rate limiting, helmet)

## 🚢 Deployment

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd code
npm run build
# Deploy dist/ folder to hosting service
```

## 📄 License

MIT

## 👥 Contributors

- Wind86861 Lab

## 🔗 Links

- Repository: https://github.com/wind86861-lab/banisa.git
- Issues: https://github.com/wind86861-lab/banisa/issues

---

**Built with ❤️ for the healthcare industry in Uzbekistan**
