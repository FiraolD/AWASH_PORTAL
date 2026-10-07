```markdown
# Awash Insurance Management System - Version 1.0

A comprehensive insurance management system built with React, TypeScript, Node.js, Express, and PostgreSQL. This system manages insurance policies, claims, underwriting workflows, and customer support.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Features](#features)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Project Structure](#project-structure)
7. [Installation & Setup](#installation--setup)
8. [Environment Variables](#environment-variables)
9. [Database Schema](#database-schema)
10. [API Documentation](#api-documentation)
11. [Workflows](#workflows)
12. [Deployment](#deployment)
13. [Future Enhancements (v2)](#future-enhancements-v2)

---

## Overview

The **Awash Insurance Management System** is a full-stack web application designed to streamline insurance operations. It provides role-based dashboards for customers, underwriting officers, claims officers, managers, and administrators.

### Key Capabilities:
- Customer policy purchase and management
- Dynamic claim filing based on product type
- Multi-level underwriting review workflow
- Claims review and approval workflow
- Role-based access control with 20+ user roles
- Support ticket system
- Audit logging
- System settings management
- Product and premium rate configuration

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **State Management** | Zustand, TanStack React Query |
| **Routing** | React Router v6 |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL (with pg driver) |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs |
| **Email** | Nodemailer (SMTP) |
| **PDF Generation** | Custom PDF service |
| **Deployment** | Render (Backend), Vercel (Frontend) |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                        │
│  React + TypeScript + Tailwind CSS + shadcn/ui              │
│  Zustand (Auth Store) + TanStack React Query                │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS REST API
┌──────────────────────▼──────────────────────────────────────┐
│                    BACKEND (Render)                         │
│  Express + TypeScript                                       │
│  JWT Authentication Middleware                              │
│  Role-Based Authorization                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ pg Pool
┌──────────────────────▼──────────────────────────────────────┐
│                  PostgreSQL (Render)                        │
│  Tables: users, policies, claims, products,                 │
│  premium_rates, support_tickets, audit_logs, etc.           │
└─────────────────────────────────────────────────────────────┘
```

---

## Features

### Customer Portal
- **Policy Purchase**: Browse available products, calculate premiums, and submit applications with dynamic custom fields per product type
- **My Policies**: View active policies with status tracking and document downloads
- **File Claims**: Submit claims with product-specific forms (Motor, Health, Fire, Travel, Life)
- **My Claims**: Track claim status from submission through approval
- **Support Tickets**: Create and manage support requests with admin responses
- **Profile Management**: Update personal information

### Underwriting Dashboard
- **Pending Review Queue**: Review submitted policy applications
- **Premium Adjustment**: Adjust premiums and send offers to customers
- **Direct Approval**: Approve policies directly (Supervisors+)
- **Final Approval**: Activate policies after customer acceptance
- **Rich Policy Detail View**: Comprehensive view of policy information including perils, riders, and vehicles

### Claims Dashboard
- **Role-Based Queue**: Officers see assigned claims, approvers see reviewed claims
- **Claim Review**: Review claims with officer notes
- **Approval Workflow**: Multi-level approval (Officer → Supervisor → Manager → Head)
- **Claim Search**: Global search across all claims with read-only detail view
- **Statistics Dashboard**: Real-time stats on claims by status

### Admin Panel
- **Product Management**: Configure insurance products with custom fields
- **Premium Rate Configuration**: Set base rates for product/coverage combinations
- **Claims Assignment Rules**: Configure automatic claim assignment based on product type and amount
- **Approval Rules**: Define multi-level approval workflows with role-specific permissions
- **Perils & Riders**: Manage insurance perils and optional riders
- **User Management**: Manage user accounts and roles
- **Audit Logs**: Track all system activities with detail view
- **System Settings**: Configure VAT rates, DRR rates, and other system parameters

---

## User Roles & Permissions

### Customer Roles
| Role | Description |
|------|-------------|
| `CUSTOMER` | Standard customer - can purchase policies, file claims, create support tickets |
| `CUSTOMER_ADMIN` | Customer support administrator |
| `CUSTOMER_SUPPORT` | Customer support agent |
| `CUSTOMER_RELATION_OFFICER` | Customer relations representative |

### Underwriting Roles
| Role | Description | Can Approve | Can Reject |
|------|-------------|-------------|------------|
| `UNDERWRITING_OFFICER_I` | Junior underwriter | ❌ | ❌ |
| `UNDERWRITING_OFFICER_II` | Mid-level underwriter | ❌ | ❌ |
| `SENIOR_UNDERWRITING_OFFICER` | Senior underwriter | ❌ | ❌ |
| `SUPERVISOR_UNDERWRITING` | Underwriting supervisor | ✅ | ✅ |
| `MANAGER_UNDERWRITING` | Underwriting manager | ✅ | ✅ |
| `HEAD_UNDERWRITING` | Head of underwriting | ✅ | ✅ |
| `UNDERWRITING_ADMIN` | Underwriting administrator | ✅ | ✅ |

### Claims Roles
| Role | Description | Can Approve | Can Reject |
|------|-------------|-------------|------------|
| `CLAIM_OFFICER_I` | Junior claim officer | ❌ | ❌ |
| `CLAIM_OFFICER_II` | Mid-level claim officer | ❌ | ❌ |
| `SENIOR_CLAIM_OFFICER` | Senior claim officer | ❌ | ❌ |
| `SUPERVISOR_CLAIMS` | Claims supervisor | ✅ | ✅ |
| `MANAGER_CLAIMS` | Claims manager | ✅ | ✅ |
| `HEAD_CLAIMS` | Head of claims | ✅ | ✅ |
| `CLAIMS_ADMIN` | Claims administrator | ✅ | ✅ |

### Executive Roles
| Role | Description |
|------|-------------|
| `MASTER_ADMIN` | System master administrator |
| `SYSTEM_ADMIN` | System administrator |
| `SUPER_ADMIN` | Super administrator |
| `CEO` | Chief Executive Officer |
| `COO` | Chief Operating Officer |
| `CFO` | Chief Financial Officer |
| `CTO` | Chief Technology Officer |
| `CCO` | Chief Compliance Officer |
| `ADMIN` | General administrator |

---

## Project Structure

```
awash-portal/
├── frontend/                          # React Frontend
│   ├── public/
│   └── src/
│       ├── api/                       # API client configuration
│       ├── components/                # Reusable components
│       │   ├── common/               # Shared components (DataTable, FileUpload, etc.)
│       │   ├── forms/                # Form components
│       │   ├── layout/               # Layout components (Header, Sidebar)
│       │   └── ui/                   # shadcn/ui components
│       ├── hooks/                     # Custom React hooks
│       ├── lib/                       # Utilities, axios instance
│       ├── pages/                     # Page components
│       │   ├── Admin/                # Admin pages
│       │   ├── Auth/                 # Login, Register, Forgot Password
│       │   ├── Claims/               # Claims dashboard, queue, new claim
│       │   ├── Customer/             # Customer portal pages
│       │   ├── Dashboard/            # Role-based dashboards
│       │   ├── Payments/             # Payment pages
│       │   ├── Policies/            # Policy pages
│       │   ├── Profile/             # User profile
│       │   └── Underwriting/         # Underwriting dashboard
│       ├── routes/                    # Route configuration
│       ├── stores/                    # Zustand stores (auth, UI)
│       └── styles/                    # Global styles
│
├── backend/                           # Express Backend
│   └── src/
│       ├── api/
│       │   └── v1/                   # API version 1 routes
│       │       ├── approval.routes.ts
│       │       ├── audit.routes.ts
│       │       ├── auth.routes.ts
│       │       ├── claims.routes.ts
│       │       ├── claims-assignment.routes.ts
│       │       ├── dashboard.router.ts
│       │       ├── policies.routes.ts
│       │       ├── premium-rates.routes.ts
│       │       ├── settings.routes.ts
│       │       ├── support.routes.ts
│       │       └── underwriting.routes.ts
│       ├── config/                    # Database configuration
│       ├── controllers/              # Business logic controllers
│       ├── lib/                       # Utilities (JWT, numbering, etc.)
│       ├── middleware/                # Express middleware
│       │   └── auth.middleware.ts    # Authentication & authorization
│       ├── services/                  # External services
│       │   └── email.service.ts     # Email sending service
│       └── types/                     # TypeScript type definitions
```

---

## Installation & Setup

### Prerequisites
- **Node.js** v18 or higher
- **PostgreSQL** 14 or higher
- **npm** or **yarn**

### Local Development Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/your-org/awash-portal.git
cd awash-portal
```

#### 2. Database Setup
```bash
# Create the database
createdb awash_insurance

# Run migrations (if available) or create tables manually using the SQL in docs/database-schema.sql
```

#### 3. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev
```

#### 4. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5001

---

## Environment Variables

### Backend (`backend/.env`)
```env
# Server
PORT=5001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/awash_insurance

# JWT
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# URLs
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:5001
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5001/api
```

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with roles, email verification, and profile info |
| `products` | Insurance products with custom field definitions |
| `policies` | Insurance policies with status tracking and premium details |
| `claims` | Insurance claims with status tracking and assignment |
| `premium_rates` | Premium rate configuration by product and coverage |
| `perils` | Insurance perils linked to products |
| `riders` | Optional insurance riders linked to products |
| `system_settings` | System configuration (VAT rate, DRR rate, etc.) |
| `audit_logs` | Activity audit trail |
| `support_tickets` | Customer support tickets |
| `support_responses` | Responses to support tickets |
| `role_levels` | Approval role hierarchy configuration |
| `approval_rules` | Multi-level approval rule configuration |
| `claims_assignment_rules` | Automatic claim assignment rules |
| `claim_timeline` | Claim status change history |
| `hospital_list` | Hospital/clinic registry for health insurance |

### Policy Status Flow
```
PENDING_UNDERWRITING → (Review) → AWAITING_CUSTOMER_APPROVAL → (Accept) → PENDING_FINAL_APPROVAL → ACTIVE
                     ↘ (Direct Approve) → ACTIVE
                     ↘ (Reject) → REJECTED
```

### Claim Status Flow
```
SUBMITTED → UNDER_REVIEW → REVIEWED → (Approve) → APPROVED → PAID
                            ↘ (Reject) → REJECTED
```

---

## API Documentation

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/signup` | Register new customer | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/auth/verify-email` | Verify email | No |
| POST | `/api/auth/resend-verification` | Resend verification email | No |
| GET | `/api/auth/profile` | Get user profile | Yes |

### Policies
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/policies` | Get all policies | Yes |
| GET | `/api/policies/stats` | Get policy statistics | Yes |
| GET | `/api/policies/my-policies` | Get customer's policies | Yes |
| POST | `/api/policies` | Create new policy | Yes |
| POST | `/api/policies/calculate-premium` | Calculate premium | Yes |
| GET | `/api/policies/perils/:productCode` | Get perils for product | Yes |
| GET | `/api/policies/riders/:productCode` | Get riders for product | Yes |

### Claims
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/claims/stats/summary` | Get claims statistics | Yes (Claims) |
| GET | `/api/claims/search` | Search claims | Yes (Claims) |
| GET | `/api/claims/my-assigned` | Get officer's assigned claims | Yes (Claims) |
| GET | `/api/claims/pending-approval` | Get claims pending approval | Yes (Approvers) |
| POST | `/api/claims/:id/review` | Review/approve/reject claim | Yes (Claims) |
| POST | `/api/claims` | Submit new claim | Yes |

### Underwriting
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/underwriting/pending-review` | Get pending reviews | Yes (Underwriting) |
| GET | `/api/underwriting/stats` | Get underwriting stats | Yes (Underwriting) |
| GET | `/api/underwriting/policies/:id` | Get policy details | Yes (Underwriting) |
| POST | `/api/underwriting/policies/:id/adjust` | Adjust premium | Yes (Underwriting) |
| POST | `/api/underwriting/policies/:id/direct-approve` | Direct approve | Yes (Supervisors+) |
| POST | `/api/underwriting/policies/:id/final-approve` | Final approve | Yes (Supervisors+) |
| POST | `/api/underwriting/policies/:id/reject` | Reject policy | Yes (Supervisors+) |

### Support
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/support/tickets` | Get user's tickets | Yes |
| POST | `/api/support/tickets` | Create ticket | Yes (Customer) |
| GET | `/api/support/tickets/:id` | Get ticket details | Yes |
| POST | `/api/support/tickets/:id/responses` | Add response | Yes |
| PATCH | `/api/support/tickets/:id/status` | Update ticket status | Yes (Admin) |
| GET | `/api/support/stats` | Get ticket statistics | Yes (Admin) |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/approval/rules` | Get approval rules | Yes (Executives) |
| POST | `/api/approval/rules` | Create approval rule | Yes (Executives) |
| PUT | `/api/approval/rules/:id` | Update approval rule | Yes (Executives) |
| GET | `/api/approval/role-levels` | Get role levels | Yes (Executives) |
| POST | `/api/approval/role-levels` | Create role level | Yes (Executives) |
| GET | `/api/claims-assignment` | Get assignment rules | Yes (Executives) |
| POST | `/api/claims-assignment` | Create assignment rule | Yes (Executives) |
| GET | `/api/audit` | Get audit logs | Yes (Executives) |
| GET | `/api/settings` | Get system settings | Yes (Executives) |
| PUT | `/api/settings` | Update system settings | Yes (Executives) |
| GET | `/api/settings/hospitals` | Get hospital list | No |

---

## Workflows

### Policy Purchase Flow
```
1. Customer browses available products
2. Selects a product → sees custom fields for that product type
3. Fills in required information (vehicle details, patient info, etc.)
4. Selects optional perils and riders
5. System calculates premium with VAT and DRR
6. Customer reviews and submits application
7. Status: PENDING_UNDERWRITING
```

### Underwriting Review Flow
```
1. Underwriter sees policy in "Pending Review" queue
2. Clicks "View" to see detailed policy information
3. Options:
   a. "Review" → Adjusts premium → Sends to customer for approval
   b. "Approve" (Supervisors+) → Policy becomes ACTIVE
   c. "Reject" → Policy is rejected with reason
4. If sent to customer, they accept/reject the adjusted offer
5. After customer acceptance → PENDING_FINAL_APPROVAL
6. Supervisor performs final approval → ACTIVE
```

### Claims Filing Flow
```
1. Customer selects an active policy
2. System shows product-specific claim form (Motor, Health, Fire, etc.)
3. For Health: hospital dropdown with "Other" option
4. Customer fills incident details and product-specific fields
5. Submits claim → Status: SUBMITTED
```

### Claims Review Flow
```
1. Claim is auto-assigned to officer based on assignment rules
2. Officer reviews claim → adds notes → marks as REVIEWED
3. Claim appears in approver's queue
4. Approver can:
   a. Approve → Status: APPROVED
   b. Reject → Status: REJECTED with reason
5. Each action is logged in claim timeline
```

---

## Deployment

### Backend (Render)
1. Connect GitHub repository to Render
2. Create a **Web Service**
3. Set build command: `cd backend && npm install && npm run build`
4. Set start command: `cd backend && npm start`
5. Add environment variables
6. Deploy

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Set root directory: `frontend`
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variable: `VITE_API_URL`
6. Deploy

### Database (Render)
1. Create a **PostgreSQL** database on Render
2. Run migration scripts to create tables
3. Connect backend service to the database

---

## Future Enhancements (v2)

### Payment Integration
- Awash Bank API integration
- Telebirr wallet integration
- CBE Birr wallet integration
- M-Pesa integration
- Payment reference generation
- Automatic status update on payment confirmation

### Email Notifications
- Email verification on signup
- Policy status update notifications
- Claim status update notifications
- Payment confirmation emails
- Support ticket response notifications

### Reporting & Analytics
- Dashboard analytics with charts
- Claims reports (by type, status, period)
- Policy reports (by product, status)
- Revenue reports
- Export to PDF/Excel

### Additional Features
- Document upload for claims
- Bulk policy operations
- Policy renewal workflow
- Endorsement processing
- Risk scoring automation
- SMS notifications
- Customer self-service portal enhancements

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2025 | Initial release with policy, claims, underwriting, support, and admin modules |

---

## Support

For issues or questions, contact the development team or create a support ticket within the application.

---

## License

Proprietary - All rights reserved by Awash Insurance.
```

---

This README covers:
- Complete system overview
- All features by module
- 20+ user roles with permissions matrix
- Full project structure
- Installation and setup instructions
- Database schema overview
- API endpoint documentation
- Workflow descriptions
- Deployment guide
- Future roadmap for v2