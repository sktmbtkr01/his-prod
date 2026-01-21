Product Requirements Document (PRD)
Hospital Information System (HIS) with AI Integration

Executive Summary
A comprehensive, unified Hospital Information System built on MERN stack that digitizes end-to-end hospital operations with integrated AI capabilities for revenue leakage detection and predictive analytics.

Tech Stack
Core Technologies

Frontend: React.js, Redux, Material-UI/Ant Design
Backend: Node.js, Express.js
Database: MongoDB
AI/ML: Python (scikit-learn, pandas, Prophet/ARIMA)
Communication: Socket.io (real-time updates), REST APIs
Authentication: JWT, bcrypt
File Storage: AWS S3 / Local storage
Reporting: PDFKit, ExcelJS


Complete File Structure

**LEGEND:** 
- ✅ = Implemented (code exists and works)
- 🔧 = Modified/Completed this session
- ⬜ = File exists but empty (needs implementation)
- 📁 = Directory exists

---

## Backend Architecture (Node.js + Express)

```
hospital-his-backend/
│
├── 📁 config/
│   ├── ✅ database.js                 # MongoDB connection
│   ├── ✅ config.js                   # Environment variables
│   ├── ✅ aws.js                      # AWS S3 configuration
│   └── ✅ constants.js                # System constants
│
├── 📁 models/ (ALL 33 MODELS COMPLETE ✅)
│   ├── ✅ User.js                     # All user types with roles
│   ├── ✅ Patient.js                  # Patient demographics & records
│   ├── ✅ Appointment.js              # OPD/IPD appointments
│   ├── ✅ Admission.js                # IPD admissions
│   ├── ✅ Emergency.js                # Emergency records
│   ├── ✅ EMR.js                      # Electronic Medical Records
│   ├── ✅ Prescription.js             # Prescriptions
│   ├── ✅ LabTest.js                  # Lab orders & results
│   ├── ✅ LabTestMaster.js            # Lab test catalog
│   ├── ✅ Radiology.js                # Radiology orders & reports
│   ├── ✅ RadiologyMaster.js          # Radiology test catalog
│   ├── ✅ Surgery.js                  # OT schedules & records
│   ├── ✅ Medicine.js                 # Medicine master
│   ├── ✅ PharmacyDispense.js         # Medicine dispensing records
│   ├── ✅ PharmacyInventory.js        # Pharmacy stock
│   ├── ✅ Billing.js                  # Bills & invoices
│   ├── ✅ BillingItem.js              # Individual billing items
│   ├── ✅ Payment.js                  # Payment transactions
│   ├── ✅ Insurance.js                # Insurance claims
│   ├── ✅ InsuranceProvider.js        # Insurance company master
│   ├── ✅ Inventory.js                # Hospital inventory items
│   ├── ✅ InventoryTransaction.js     # Stock in/out records
│   ├── ✅ Department.js               # Department master
│   ├── ✅ Bed.js                      # Bed master & allocation
│   ├── ✅ Ward.js                     # Ward master
│   ├── ✅ Tariff.js                   # Service pricing master
│   ├── ✅ TariffCategory.js           # Tariff categories
│   ├── ✅ Staff.js                    # Staff/HR records
│   ├── ✅ Attendance.js               # Staff attendance
│   ├── ✅ AuditLog.js                 # System audit trails
│   ├── ✅ Notification.js             # System notifications
│   ├── ✅ AIAnomaly.js                # AI-detected anomalies
│   └── ✅ AIPrediction.js             # AI predictions & forecasts
│
├── 📁 routes/ (ALL 23 ROUTES COMPLETE ✅)
│   ├── ✅ auth.routes.js              # Login, logout, token refresh
│   ├── ✅ patient.routes.js           # Patient CRUD & search
│   ├── ✅ opd.routes.js               # OPD management
│   ├── ✅ ipd.routes.js               # IPD management
│   ├── ✅ emergency.routes.js         # Emergency management
│   ├── ✅ emr.routes.js               # EMR endpoints
│   ├── ✅ prescription.routes.js      # Prescription management
│   ├── ✅ lab.routes.js               # Lab orders & results
│   ├── ✅ radiology.routes.js         # Radiology orders & reports
│   ├── ✅ pharmacy.routes.js          # Pharmacy operations
│   ├── ✅ billing.routes.js           # Billing & invoicing
│   ├── ✅ payment.routes.js           # Payment processing
│   ├── ✅ insurance.routes.js         # Insurance claims
│   ├── ✅ surgery.routes.js           # OT scheduling
│   ├── ✅ inventory.routes.js         # Inventory management
│   ├── ✅ bed.routes.js               # Bed management
│   ├── ✅ staff.routes.js             # HR/Staff management
│   ├── ✅ department.routes.js        # Department management
│   ├── ✅ tariff.routes.js            # Tariff management
│   ├── ✅ analytics.routes.js         # Dashboard & reports
│   ├── ✅ ai.routes.js                # AI endpoints (both models)
│   ├── ✅ notification.routes.js      # Notifications
│   └── ✅ admin.routes.js             # Admin configurations
│
├── 📁 controllers/ (ALL 23 CONTROLLERS COMPLETE ✅)
│   ├── ✅ auth.controller.js          # 🔧 Fixed JWT config paths
│   ├── ✅ patient.controller.js
│   ├── ✅ opd.controller.js
│   ├── ✅ ipd.controller.js
│   ├── ✅ emergency.controller.js
│   ├── ✅ emr.controller.js
│   ├── ✅ prescription.controller.js
│   ├── ✅ lab.controller.js
│   ├── ✅ radiology.controller.js
│   ├── ✅ pharmacy.controller.js
│   ├── ✅ billing.controller.js
│   ├── ✅ payment.controller.js
│   ├── ✅ insurance.controller.js
│   ├── ✅ surgery.controller.js
│   ├── ✅ inventory.controller.js
│   ├── ✅ bed.controller.js
│   ├── ✅ staff.controller.js
│   ├── ✅ department.controller.js
│   ├── ✅ tariff.controller.js
│   ├── ✅ analytics.controller.js
│   ├── ✅ ai.controller.js            # Calls Python ML services
│   ├── ✅ notification.controller.js
│   └── ✅ admin.controller.js
│
├── 📁 middleware/ (ALL 6 MIDDLEWARE COMPLETE ✅🔧)
│   ├── 🔧 auth.middleware.js          # JWT verification - COMPLETED
│   ├── 🔧 rbac.middleware.js          # Role-based access control - COMPLETED
│   ├── 🔧 validation.middleware.js    # Request validation - COMPLETED
│   ├── 🔧 error.middleware.js         # Error handling - COMPLETED
│   ├── 🔧 audit.middleware.js         # Audit logging - COMPLETED
│   └── 🔧 upload.middleware.js        # File upload handling - COMPLETED
│
├── 📁 services/ (11 FILES - ALL NEED IMPLEMENTATION ⬜)
│   ├── ⬜ patient.service.js          # Patient business logic
│   ├── ⬜ appointment.service.js      # Appointment scheduling
│   ├── ⬜ billing.service.js          # Billing calculations
│   ├── ⬜ insurance.service.js        # Insurance processing
│   ├── ⬜ inventory.service.js        # Stock management
│   ├── ⬜ notification.service.js     # Email/SMS/Push notifications
│   ├── ⬜ report.service.js           # Report generation
│   ├── ⬜ pdf.service.js              # PDF generation
│   ├── ⬜ excel.service.js            # Excel generation
│   ├── ⬜ socket.service.js           # Real-time updates
│   └── ⬜ ml.service.js               # ML API caller (Python bridge)
│
├── 📁 utils/ (6 FILES - 4 COMPLETE, 2 NEED IMPLEMENTATION)
│   ├── ⬜ validators.js               # Input validators
│   ├── 🔧 helpers.js                  # Helper functions - COMPLETED
│   ├── ⬜ encryption.js               # Password hashing
│   ├── ⬜ date.utils.js               # Date utilities
│   ├── 🔧 response.js                 # Standard API responses - COMPLETED
│   ├── 🔧 logger.js                   # Winston logger - COMPLETED
│   ├── 🔧 asyncHandler.js             # Async handler - CREATED
│   └── 🔧 errorResponse.js            # Error response class - CREATED
│
├── 📁 tests/
│   ├── ⬜ unit/
│   ├── ⬜ integration/
│   └── ⬜ e2e/
│
├── 📁 socket/
│   └── ⬜ socket.handler.js           # Socket.io event handlers
│
├── 📁 scripts/
│   ├── 🔧 seed.js                     # Database seeding - COMPLETED WITH DATA
│   └── ⬜ migrate.js                  # Data migration
│
├── ⬜ .env.example                     # Environment template (empty)
├── ✅ .gitignore
├── ✅ package.json
├── ✅ package-lock.json
├── 🔧 server.js                        # Entry point - COMPLETED
└── ⬜ README.md
```

---

## ML Services (Python - Microservices)

```
hospital-his-ml/
│
├── 📁 revenue_leakage/
│   ├── ⬜ app.py                      # Flask API for revenue ML
│   ├── ⬜ data_processor.py           # Data preprocessing
│   ├── ⬜ anomaly_detector.py         # Isolation Forest model
│   ├── ⬜ pattern_analyzer.py         # Rule-based patterns
│   ├── ⬜ alert_generator.py          # Alert generation logic
│   ├── ⬜ model_trainer.py            # Model training scripts
│   ├── 📁 models/
│   │   └── ⬜ isolation_forest.pkl    # Trained model (needs training)
│   ├── ⬜ config.py                   # ML config
│   └── ✅ requirements.txt
│
├── 📁 predictive_analytics/
│   ├── ⬜ app.py                      # Flask API for predictions
│   ├── ⬜ time_series.py              # Prophet/ARIMA implementation
│   ├── ⬜ opd_predictor.py            # OPD rush hour prediction
│   ├── ⬜ bed_predictor.py            # Bed occupancy forecasting
│   ├── ⬜ lab_predictor.py            # Lab workload forecasting
│   ├── 📁 models/
│   │   ├── ⬜ opd_prophet.pkl         # Needs training
│   │   ├── ⬜ bed_arima.pkl           # Needs training
│   │   └── ⬜ lab_prophet.pkl         # Needs training
│   ├── ⬜ config.py
│   └── ⬜ requirements.txt
│
├── 📁 shared/
│   ├── ⬜ db_connector.py             # MongoDB connection
│   └── ⬜ utils.py                    # Shared utilities
│
├── ⬜ docker-compose.yml              # Multi-service setup
└── ⬜ README.md
```

---
├── revenue_leakage/
│   ├── app.py                      # Flask API for revenue ML [DONE]
│   ├── data_processor.py           # Data preprocessing [DONE]
│   ├── anomaly_detector.py         # Isolation Forest model [DONE]
│   ├── pattern_analyzer.py         # Rule-based patterns [DONE]
│   ├── alert_generator.py          # Alert generation logic [DONE]
│   ├── model_trainer.py            # Model training scripts [DONE]
│   ├── models/
│   │   └── isolation_forest.pkl    # Trained model (generated at runtime)
│   ├── config.py                   # ML config [DONE]
│   └── requirements.txt            # [DONE]
│
├── predictive_analytics/
│   ├── app.py                      # Flask API for predictions [DONE]
│   ├── time_series.py              # Prophet/ARIMA implementation [DONE]
│   ├── opd_predictor.py            # OPD rush hour prediction [DONE]
│   ├── bed_predictor.py            # Bed occupancy forecasting [DONE]
│   ├── lab_predictor.py            # Lab workload forecasting [DONE]
│   ├── models/
│   │   ├── opd_prophet.pkl         # (generated at runtime)
│   │   ├── bed_arima.pkl           # (generated at runtime)
│   │   └── lab_prophet.pkl         # (generated at runtime)
│   ├── config.py                   # [DONE]
│   └── requirements.txt            # [DONE]
│
├── shared/
│   ├── db_connector.py             # MongoDB connection [DONE]
│   └── utils.py                    # Shared utilities [DONE]
│
├── docker-compose.yml              # Multi-service setup
└── README.md


Frontend Architecture (React.js)
hospital-his-frontend/
│
├── public/
│   ├── index.html
│   ├── favicon.ico
│   ├── manifest.json
│   └── assets/
│       ├── images/
│       ├── icons/
│       └── fonts/
│
├── src/
│   ├── App.js                      # Main app component
│   ├── index.js                    # Entry point
│   ├── routes.js                   # Route definitions
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Loader.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── DataTable.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── Notification.jsx
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── DatePicker.jsx
│   │   │   ├── FileUpload.jsx
│   │   │   └── PrintPreview.jsx
│   │   │
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── ChangePassword.jsx
│   │   │
│   │   ├── patient/
│   │   │   ├── PatientRegistration.jsx
│   │   │   ├── PatientSearch.jsx
│   │   │   ├── PatientProfile.jsx
│   │   │   ├── PatientHistory.jsx
│   │   │   └── PatientCard.jsx
│   │   │
│   │   ├── opd/
│   │   │   ├── OPDQueue.jsx
│   │   │   ├── OPDConsultation.jsx
│   │   │   ├── OPDAppointment.jsx
│   │   │   ├── OPDBilling.jsx
│   │   │   └── OPDDashboard.jsx
│   │   │
│   │   ├── ipd/
│   │   │   ├── IPDAdmission.jsx
│   │   │   ├── IPDPatientList.jsx
│   │   │   ├── IPDCaseSheet.jsx
│   │   │   ├── IPDDischarge.jsx
│   │   │   └── IPDDashboard.jsx
│   │   │
│   │   ├── emergency/
│   │   │   ├── EmergencyTriage.jsx
│   │   │   ├── EmergencyQueue.jsx
│   │   │   ├── EmergencyTreatment.jsx
│   │   │   └── EmergencyDashboard.jsx
│   │   │
│   │   ├── emr/
│   │   │   ├── EMRView.jsx
│   │   │   ├── VitalsEntry.jsx
│   │   │   ├── ProgressNotes.jsx
│   │   │   ├── ClinicalDocuments.jsx
│   │   │   └── PatientTimeline.jsx
│   │   │
│   │   ├── lab/
│   │   │   ├── LabOrderEntry.jsx
│   │   │   ├── LabWorkQueue.jsx
│   │   │   ├── LabResultEntry.jsx
│   │   │   ├── LabReportViewer.jsx
│   │   │   └── LabDashboard.jsx
│   │   │
│   │   ├── radiology/
│   │   │   ├── RadiologyOrderEntry.jsx
│   │   │   ├── RadiologyWorkQueue.jsx
│   │   │   ├── RadiologyReportEntry.jsx
│   │   │   ├── RadiologyImageViewer.jsx
│   │   │   └── RadiologyDashboard.jsx
│   │   │
│   │   ├── pharmacy/
│   │   │   ├── PharmacyQueue.jsx
│   │   │   ├── MedicineDispense.jsx
│   │   │   ├── PharmacyInventory.jsx
│   │   │   ├── StockManagement.jsx
│   │   │   ├── ExpiryMonitor.jsx
│   │   │   └── PharmacyDashboard.jsx
│   │   │
│   │   ├── surgery/
│   │   │   ├── OTSchedule.jsx
│   │   │   ├── SurgeryBooking.jsx
│   │   │   ├── OTRoster.jsx
│   │   │   ├── SurgeryNotes.jsx
│   │   │   └── OTDashboard.jsx
│   │   │
│   │   ├── billing/
│   │   │   ├── BillGeneration.jsx
│   │   │   ├── BillSearch.jsx
│   │   │   ├── PaymentCollection.jsx
│   │   │   ├── CreditBills.jsx
│   │   │   ├── BillCancellation.jsx
│   │   │   ├── RevenueLeakageAlerts.jsx  # AI Component
│   │   │   └── BillingDashboard.jsx
│   │   │
│   │   ├── insurance/
│   │   │   ├── InsuranceVerification.jsx
│   │   │   ├── ClaimSubmission.jsx
│   │   │   ├── ClaimTracking.jsx
│   │   │   ├── PreAuthorization.jsx
│   │   │   └── InsuranceDashboard.jsx
│   │   │
│   │   ├── bed/
│   │   │   ├── BedAllocation.jsx
│   │   │   ├── BedTransfer.jsx
│   │   │   ├── BedOccupancyView.jsx
│   │   │   ├── WardManagement.jsx
│   │   │   └── BedPredictiveAnalytics.jsx  # AI Component
│   │   │
│   │   ├── inventory/
│   │   │   ├── InventoryList.jsx
│   │   │   ├── StockEntry.jsx
│   │   │   ├── StockIssue.jsx
│   │   │   ├── StockAdjustment.jsx
│   │   │   ├── PurchaseOrder.jsx
│   │   │   ├── VendorManagement.jsx
│   │   │   └── InventoryDashboard.jsx
│   │   │
│   │   ├── hr/
│   │   │   ├── StaffDirectory.jsx
│   │   │   ├── StaffRegistration.jsx
│   │   │   ├── AttendanceManagement.jsx
│   │   │   ├── LeaveManagement.jsx
│   │   │   ├── ShiftRoster.jsx
│   │   │   └── HRDashboard.jsx
│   │   │
│   │   ├── analytics/
│   │   │   ├── ExecutiveDashboard.jsx
│   │   │   ├── ClinicalAnalytics.jsx
│   │   │   ├── FinancialAnalytics.jsx
│   │   │   ├── OperationalAnalytics.jsx
│   │   │   ├── OPDPredictiveAnalytics.jsx   # AI Component
│   │   │   ├── LabWorkloadForecast.jsx      # AI Component
│   │   │   └── CustomReports.jsx
│   │   │
│   │   ├── admin/
│   │   │   ├── UserManagement.jsx
│   │   │   ├── RolePermissions.jsx
│   │   │   ├── DepartmentMaster.jsx
│   │   │   ├── TariffMaster.jsx
│   │   │   ├── ServiceMaster.jsx
│   │   │   ├── AuditLogs.jsx
│   │   │   ├── SystemConfiguration.jsx
│   │   │   └── BackupRestore.jsx
│   │   │
│   │   └── notifications/
│   │       ├── NotificationCenter.jsx
│   │       ├── NotificationBell.jsx
│   │       └── NotificationSettings.jsx
│   │
│   ├── redux/
│   │   ├── store.js                # Redux store configuration
│   │   ├── rootReducer.js          # Combine all reducers
│   │   │
│   │   ├── slices/
│   │   │   ├── authSlice.js
│   │   │   ├── patientSlice.js
│   │   │   ├── opdSlice.js
│   │   │   ├── ipdSlice.js
│   │   │   ├── emergencySlice.js
│   │   │   ├── labSlice.js
│   │   │   ├── radiologySlice.js
│   │   │   ├── pharmacySlice.js
│   │   │   ├── billingSlice.js
│   │   │   ├── insuranceSlice.js
│   │   │   ├── bedSlice.js
│   │   │   ├── inventorySlice.js
│   │   │   ├── staffSlice.js
│   │   │   ├── analyticsSlice.js
│   │   │   ├── aiSlice.js          # AI features state
│   │   │   └── notificationSlice.js
│   │   │
│   │   └── thunks/
│   │       ├── patientThunks.js    # Async actions
│   │       ├── billingThunks.js
│   │       ├── aiThunks.js         # AI API calls
│   │       └── ...
│   │
│   ├── services/
│   │   ├── api.js                  # Axios configuration
│   │   ├── auth.service.js
│   │   ├── patient.service.js
│   │   ├── opd.service.js
│   │   ├── ipd.service.js
│   │   ├── emergency.service.js
│   │   ├── lab.service.js
│   │   ├── radiology.service.js
│   │   ├── pharmacy.service.js
│   │   ├── billing.service.js
│   │   ├── insurance.service.js
│   │   ├── bed.service.js
│   │   ├── inventory.service.js
│   │   ├── staff.service.js
│   │   ├── analytics.service.js
│   │   ├── ai.service.js           # ML API calls
│   │   ├── notification.service.js
│   │   ├── socket.service.js       # Socket.io client
│   │   └── report.service.js
│   │
│   ├── utils/
│   │   ├── constants.js            # App constants
│   │   ├── helpers.js              # Helper functions
│   │   ├── validators.js           # Form validators
│   │   ├── permissions.js          # RBAC helpers
│   │   ├── dateUtils.js            # Date formatting
│   │   └── exportUtils.js          # Export to PDF/Excel
│   │
│   ├── hooks/
│   │   ├── useAuth.js              # Authentication hook
│   │   ├── useSocket.js            # Socket.io hook
│   │   ├── useNotification.js      # Notification hook
│   │   ├── usePagination.js        # Pagination hook
│   │   └── useDebounce.js          # Debounce hook
│   │
│   ├── styles/
│   │   ├── global.css              # Global styles
│   │   ├── variables.css           # CSS variables
│   │   └── themes/
│   │       ├── light.css
│   │       └── dark.css
│   │
│   ├── config/
│   │   ├── routes.config.js        # Route configurations
│   │   └── permissions.config.js   # Role permissions
│   │
│   └── tests/
│       ├── components/
│       ├── services/
│       └── utils/
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── craco.config.js                 # If using CRACO
└── README.md

Database Schema (MongoDB Collections)
Core Collections
javascript// users
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  role: String, // doctor, nurse, receptionist, lab_tech, radiologist, pharmacist, billing, insurance, admin, compliance
  department: ObjectId (ref: Department),
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    qualification: String,
    specialization: String,
    registrationNumber: String
  },
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}

// patients
{
  _id: ObjectId,
  patientId: String (unique, auto-generated),
  firstName: String,
  lastName: String,
  dateOfBirth: Date,
  gender: String,
  phone: String,
  email: String,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  bloodGroup: String,
  allergies: [String],
  medicalHistory: [String],
  insuranceDetails: {
    provider: ObjectId (ref: InsuranceProvider),
    policyNumber: String,
    validTill: Date
  },
  createdAt: Date,
  updatedAt: Date
}

// appointments
{
  _id: ObjectId,
  appointmentNumber: String (unique),
  patient: ObjectId (ref: Patient),
  doctor: ObjectId (ref: User),
  department: ObjectId (ref: Department),
  type: String, // opd, followup
  scheduledDate: Date,
  scheduledTime: String,
  status: String, // scheduled, checked-in, in-consultation, completed, cancelled
  tokenNumber: Number,
  chiefComplaint: String,
  notes: String,
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}

// admissions (IPD)
{
  _id: ObjectId,
  admissionNumber: String (unique),
  patient: ObjectId (ref: Patient),
  doctor: ObjectId (ref: User),
  department: ObjectId (ref: Department),
  ward: ObjectId (ref: Ward),
  bed: ObjectId (ref: Bed),
  admissionDate: Date,
  dischargeDate: Date,
  admissionType: String, // emergency, planned
  diagnosis: String,
  status: String, // admitted, discharged, transferred
  estimatedDischarge: Date,
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}

// emr (Electronic Medical Records)
{
  _id: ObjectId,
  patient: ObjectId (ref: Patient),
  visit: ObjectId (ref: Appointment/Admission),
  visitType: String, // opd, ipd, emergency
  date: Date,
  vitals: {
    bloodPressure: String,
    pulse: Number,
    temperature: Number,
    respiratoryRate: Number,
    oxygenSaturation: Number,
    weight: Number,
    height: Number,
    bmi: Number
  },
  chiefComplaint: String,
  presentingIllness: String,
  examination: String,
  diagnosis: String,
  treatment: String,
  notes: String,
  doctor: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}

// prescriptions
{
  _id: ObjectId,
  prescriptionNumber: String (unique),
  patient: ObjectId (ref: Patient),
  visit: ObjectId (ref: Appointment/Admission),
  doctor: ObjectId (ref: User),
  medicines: [{
    medicine: ObjectId (ref: Medicine),
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String,
    quantity: Number
  }],
  specialInstructions: String,
  isDispensed: Boolean,
  dispensedBy: ObjectId (ref: User),
  dispensedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// lab_tests
{
  _id: ObjectId,
  testNumber: String (unique),
  patient: ObjectId (ref: Patient),
  visit: ObjectId (ref: Appointment/Admission),
  orderedBy: ObjectId (ref: User),
  test: ObjectId (ref: LabTestMaster),
  sampleCollectedAt: Date,
  sampleCollectedBy: ObjectId (ref: User),
  status: String, // ordered, sample-collected, in-progress, completed, cancelled
  results: [{
    parameter: String,
    value: String,
    unit: String,
    normalRange: String,
    isAbnormal: Boolean
  }],
  remarks: String,
  performedBy: ObjectId (ref: User),
  completedAt: Date,
  isReportGenerated: Boolean,
  reportUrl: String,
  createdAt: Date,
  updatedAt: Date
}

// radiology_tests
{
  _id: ObjectId,
  testNumber: String (unique),
  patient: ObjectId (ref: Patient),
  visit: ObjectId (ref: Appointment/Admission),
  orderedBy: ObjectId (ref: User),
  test: ObjectId (ref: RadiologyMaster),
  scheduledAt: Date,
  status: String, // ordered, scheduled, in-progress, completed, cancelled
  findings: String,
  impression: String,
  recommendations: String,
  performedBy: ObjectId (ref: User),
  completedAt: Date,
  images: [String], // URLs
  reportUrl: String,
  createdAt: Date,
  updatedAt: Date
}

// surgeries
{
  _id: ObjectId,
  surgeryNumber: String (unique),
  patient: ObjectId (ref: Patient),
  admission: ObjectId (ref: Admission),
  surgeon: ObjectId (ref: User),
  assistantSurgeons: [ObjectId] (ref: User),
  anesthetist: ObjectId (ref: User),
  nurses: [ObjectId] (ref: User),
  otNumber: String,
  scheduledDate: Date,
  scheduledTime: String,
  actualStartTime: Date,
  actualEndTime: Date,
  surgeryType: String,
  diagnosis: String,
  procedure: String,
  anesthesiaType: String,
  complications: String,
  postOpInstructions: String,
  status: String, // scheduled, in-progress, completed, cancelled
  createdAt: Date,
  updatedAt: Date
}

// billings
{
  _id: ObjectId,
  billNumber: String (unique),
  patient: ObjectId (ref: Patient),
  visit: ObjectId (ref: Appointment/Admission),
  visitType: String, // opd, ipd, emergency
  billDate: Date,
  items: [{
    itemType: String, // consultation, procedure, lab, radiology, medicine, bed, etc.
    itemReference: ObjectId, // Reference to specific item
    description: String,
    quantity: Number,
    rate: Number,
    amount: Number,
    discount: Number,
    tax: Number,
    netAmount: Number,
    isBilled: Boolean,
    billedAt: Date
  }],
  subtotal: Number,
  totalDiscount: Number,
  totalTax: Number,
  grandTotal: Number,
  paidAmount: Number,
  balanceAmount: Number,
  paymentStatus: String, // pending, partial, paid
  insuranceClaim: ObjectId (ref: Insurance),
  generatedBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}

// payments
{
  _id: ObjectId,
  receiptNumber: String (unique),
  bill: ObjectId (ref: Billing),
  patient: ObjectId (ref: Patient),
  amount: Number,
  paymentMode: String, // cash, card, upi, cheque, insurance
  paymentDetails: {
    transactionId: String,
    cardLast4: String,
    bankName: String,
    chequeNumber: String
  },
  paymentDate: Date,
  collectedBy: ObjectId (ref: User),
  createdAt: Date
}

// insurance_claims
{
  _id: ObjectId,
  claimNumber: String (unique),
  patient: ObjectId (ref: Patient),
  admission: ObjectId (ref: Admission),
  provider: ObjectId (ref: InsuranceProvider),
  policyNumber: String,
  claimAmount: Number,
  approvedAmount: Number,
  status: String, // pending, pre-authorized, approved, rejected, settled
  submittedDate: Date,
  approvalDate: Date,
  settlementDate: Date,
  documents: [String], // URLs
  remarks: String,
  handledBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}

// beds
{
  _id: ObjectId,
  bedNumber: String,
  ward: ObjectId (ref: Ward),
  bedType: String, // general, semi-private, private, icu, nicu
  status: String, // available, occupied, under-maintenance, reserved
  currentPatient: ObjectId (ref: Patient),
  currentAdmission: ObjectId (ref: Admission),
  tariff: Number,
  createdAt: Date,
  updatedAt: Date
}

// pharmacy_inventory
{
  _id: ObjectId,
  medicine: ObjectId (ref: Medicine),
  batchNumber: String,
  expiryDate: Date,
  quantity: Number,
  purchaseRate: Number,
  sellingRate: Number,
  supplier: String,
  purchaseDate: Date,   
  status: String, // available, low-stock, expired
  createdAt: Date,
  updatedAt: Date
}
// inventory (Hospital Supplies)
{
_id: ObjectId,
itemName: String,
itemCode: String,
category: String,
unit: String,
quantity: Number,
reorderLevel: Number,
location: String,
supplier: String,
lastPurchaseDate: Date,
lastPurchaseRate: Number,
createdAt: Date,
updatedAt: Date
}
// ai_anomalies (Revenue Leakage)
{
_id: ObjectId,
anomalyType: String, // unbilled-service, unbilled-medicine, unusual-pattern
detectionDate: Date,
patient: ObjectId (ref: Patient),
visit: ObjectId (ref: Appointment/Admission),
description: String,
details: {
service: String,
expectedRevenue: Number,
actualRevenue: Number,
leakageAmount: Number
},
status: String, // detected, under-review, resolved, false-positive
reviewedBy: ObjectId (ref: User),
reviewedAt: Date,
resolutionNotes: String,
anomalyScore: Number,
createdAt: Date
}
// ai_predictions (Operational Forecasts)
{
_id: ObjectId,
predictionType: String, // opd-rush, bed-occupancy, lab-workload
predictionDate: Date,
forecastPeriod: {
from: Date,
to: Date
},
predictions: [{
timestamp: Date,
predictedValue: Number,
confidence: Number
}],
accuracy: Number, // calculated after actual data
createdAt: Date
}
// audit_logs
{
_id: ObjectId,
user: ObjectId (ref: User),
action: String,
entity: String,
entityId: ObjectId,
changes: Object,
ipAddress: String,
userAgent: String,
timestamp: Date
}
// notifications
{
_id: ObjectId,
recipient: ObjectId (ref: User),
type: String, // info, warning, critical, alert
title: String,
message: String,
relatedEntity: {
type: String,
id: ObjectId
},
isRead: Boolean,
readAt: Date,
createdAt: Date
}

---

## API Endpoints Structure

### Authentication
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh-token
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
PUT    /api/auth/change-password

### Patients
POST   /api/patients
GET    /api/patients
GET    /api/patients/:id
PUT    /api/patients/:id
DELETE /api/patients/:id
GET    /api/patients/search?query=
GET    /api/patients/:id/history
GET    /api/patients/:id/emr

### OPD
POST   /api/opd/appointments
GET    /api/opd/appointments
GET    /api/opd/appointments/:id
PUT    /api/opd/appointments/:id
DELETE /api/opd/appointments/:id
PUT    /api/opd/appointments/:id/checkin
GET    /api/opd/queue
GET    /api/opd/dashboard

### IPD
POST   /api/ipd/admissions
GET    /api/ipd/admissions
GET    /api/ipd/admissions/:id
PUT    /api/ipd/admissions/:id
POST   /api/ipd/admissions/:id/discharge
GET    /api/ipd/patients
GET    /api/ipd/dashboard

### Emergency
POST   /api/emergency/cases
GET    /api/emergency/cases
GET    /api/emergency/cases/:id
PUT    /api/emergency/cases/:id
GET    /api/emergency/queue

### EMR
POST   /api/emr
GET    /api/emr/:patientId
GET    /api/emr/visit/:visitId
PUT    /api/emr/:id
POST   /api/emr/:id/vitals
GET    /api/emr/:id/timeline

### Prescriptions
POST   /api/prescriptions
GET    /api/prescriptions
GET    /api/prescriptions/:id
PUT    /api/prescriptions/:id
GET    /api/prescriptions/patient/:patientId

### Lab
POST   /api/lab/orders
GET    /api/lab/orders
GET    /api/lab/orders/:id
PUT    /api/lab/orders/:id
POST   /api/lab/orders/:id/collect-sample
POST   /api/lab/orders/:id/enter-results
POST   /api/lab/orders/:id/generate-report
GET    /api/lab/queue
GET    /api/lab/dashboard

### Radiology
POST   /api/radiology/orders
GET    /api/radiology/orders
GET    /api/radiology/orders/:id
PUT    /api/radiology/orders/:id
POST   /api/radiology/orders/:id/schedule
POST   /api/radiology/orders/:id/enter-report
GET    /api/radiology/queue
GET    /api/radiology/dashboard

### Pharmacy
POST   /api/pharmacy/dispense
GET    /api/pharmacy/queue
GET    /api/pharmacy/inventory
POST   /api/pharmacy/inventory
PUT    /api/pharmacy/inventory/:id
GET    /api/pharmacy/expiry-alerts
GET    /api/pharmacy/dashboard

### Surgery/OT
POST   /api/surgery/schedule
GET    /api/surgery/schedules
GET    /api/surgery/schedules/:id
PUT    /api/surgery/schedules/:id
GET    /api/surgery/ot-roster
GET    /api/surgery/dashboard

### Billing
POST   /api/billing/generate
GET    /api/billing/bills
GET    /api/billing/bills/:id
PUT    /api/billing/bills/:id
GET    /api/billing/patient/:patientId
GET    /api/billing/pending
GET    /api/billing/dashboard

### Payments
POST   /api/payments
GET    /api/payments
GET    /api/payments/:id
GET    /api/payments/bill/:billId

### Insurance
POST   /api/insurance/claims
GET    /api/insurance/claims
GET    /api/insurance/claims/:id
PUT    /api/insurance/claims/:id
POST   /api/insurance/pre-authorization
GET    /api/insurance/providers

### Beds
GET    /api/beds
GET    /api/beds/:id
PUT    /api/beds/:id
POST   /api/beds/allocate
POST   /api/beds/transfer
GET    /api/beds/availability
GET    /api/beds/occupancy

### Inventory
GET    /api/inventory
POST   /api/inventory
PUT    /api/inventory/:id
DELETE /api/inventory/:id
POST   /api/inventory/stock-in
POST   /api/inventory/stock-out
GET    /api/inventory/low-stock

### Staff/HR
GET    /api/staff
POST   /api/staff
PUT    /api/staff/:id
DELETE /api/staff/:id
POST   /api/staff/attendance
GET    /api/staff/attendance
POST   /api/staff/leaves
GET    /api/staff/leaves

### Analytics
GET    /api/analytics/executive-dashboard
GET    /api/analytics/clinical
GET    /api/analytics/financial
GET    /api/analytics/operational
GET    /api/analytics/reports
POST   /api/analytics/custom-report

### AI Endpoints
Revenue Leakage Detection
POST   /api/ai/revenue/scan              # Trigger anomaly detection
GET    /api/ai/revenue/anomalies          # Get detected anomalies
GET    /api/ai/revenue/anomalies/:id      # Get specific anomaly
PUT    /api/ai/revenue/anomalies/:id      # Update anomaly status
GET    /api/ai/revenue/dashboard          # Revenue leakage dashboard
Predictive Analytics
POST   /api/ai/predict/opd-rush           # Predict OPD rush hours
POST   /api/ai/predict/bed-occupancy      # Predict bed occupancy
POST   /api/ai/predict/lab-workload       # Predict lab workload
GET    /api/ai/predictions                # Get all predictions
GET    /api/ai/predictions/:type          # Get specific prediction type

### Admin
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id
GET    /api/admin/departments
POST   /api/admin/departments
GET    /api/admin/tariffs
POST   /api/admin/tariffs
GET    /api/admin/audit-logs
GET    /api/admin/system-config
PUT    /api/admin/system-config

---

## ML Service APIs (Python Flask)

### Revenue Leakage Service (Port 5001)
POST   /ml/revenue/detect                 # Run anomaly detection
POST   /ml/revenue/train                  # Train/retrain model
GET    /ml/revenue/health                 # Service health check

### Predictive Analytics Service (Port 5002)
POST   /ml/predict/opd                    # OPD predictions
POST   /ml/predict/beds                   # Bed occupancy predictions
POST   /ml/predict/lab                    # Lab workload predictions
POST   /ml/predict/train                  # Train/retrain models
GET    /ml/predict/health                 # Service health check

---

## Integration Requirements

### 1. Node.js Backend ↔ MongoDB
- Mongoose ODM for data modeling
- Connection pooling
- Transaction support for critical operations

### 2. React Frontend ↔ Node.js Backend
- Axios for HTTP requests
- Redux for state management
- Socket.io for real-time updates

### 3. Node.js Backend ↔ Python ML Services
- HTTP REST calls from Node to Python
- JSON data exchange
- Async processing for ML operations

### 4. Python ML Services ↔ MongoDB
- PyMongo for direct DB access
- Read-only access for training data
- Write access for predictions/anomalies

### 5. Real-time Communication
- Socket.io for:
  - New patient registrations
  - Queue updates
  - Lab/radiology result availability
  - Billing alerts
  - AI anomaly notifications

---

## Dependencies

### Backend (package.json)
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^7.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "socket.io": "^4.5.0",
    "axios": "^1.4.0",
    "multer": "^1.4.5-lts.1",
    "pdfkit": "^0.13.0",
    "exceljs": "^4.3.0",
    "nodemailer": "^6.9.0",
    "winston": "^3.8.0",
    "joi": "^17.9.0",
    "express-rate-limit": "^6.7.0",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0"
  }
}
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.11.0",
    "@reduxjs/toolkit": "^1.9.0",
    "react-redux": "^8.0.0",
    "axios": "^1.4.0",
    "socket.io-client": "^4.5.0",
    "@mui/material": "^5.13.0",
    "@mui/icons-material": "^5.11.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "recharts": "^2.5.0",
    "date-fns": "^2.30.0",
    "react-datepicker": "^4.11.0",
    "react-toastify": "^9.1.0",
    "formik": "^2.2.9",
    "yup": "^1.2.0",
    "jspdf": "^2.5.1",
    "file-saver": "^2.0.5"
  }
}
```

### ML Services (requirements.txt)
Revenue Leakage Service
flask==2.3.2
flask-cors==4.0.0
pandas==2.0.2
numpy==1.24.3
scikit-learn==1.2.2
pymongo==4.3.3
python-dotenv==1.0.0
joblib==1.2.0
Predictive Analytics Service
flask==2.3.2
flask-cors==4.0.0
pandas==2.0.2
numpy==1.24.3
prophet==1.1.2
statsmodels==0.14.0
pymongo==4.3.3
python-dotenv==1.0.0
joblib==1.2.0
matplotlib==3.7.1

---

## Development Workflow

### 1. Initial Setup
```bash
# Backend
cd hospital-his-backend
npm install
cp .env.example .env
# Configure MongoDB connection
npm run dev

# Frontend
cd hospital-his-frontend
npm install
cp .env.example .env
# Configure API endpoint
npm start

# ML Services
cd hospital-his-ml/revenue_leakage
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py

cd ../predictive_analytics
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### 2. Database Seeding
```bash
node scripts/seed.js
```

### 3. Testing
```bash
# Backend
npm test

# Frontend
npm test

# ML Services
pytest
```

---

## Deployment Considerations

### Environment Variables (.env)

**Backend:**
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hospital_his
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
ML_REVENUE_SERVICE_URL=http://localhost:5001
ML_PREDICT_SERVICE_URL=http://localhost:5002
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
AWS_ACCESS_KEY=your_aws_key
AWS_SECRET_KEY=your_aws_secret
AWS_BUCKET_NAME=hospital-his-files

**Frontend:**
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000

**ML Services:**
FLASK_PORT=5001 (or 5002)
MONGODB_URI=mongodb://localhost:27017/hospital_his
MODEL_PATH=./models

---

## Key Features Summary

### Core HIS Features:
1. Patient Management (Registration, Search, Profile)
2. OPD Management (Appointments, Queue, Consultation)
3. IPD Management (Admission, Case Sheet, Discharge)
4. Emergency Management (Triage, Treatment)
5. EMR (Vitals, Progress Notes, Documents)
6. Lab Management (Orders, Results, Reports)
7. Radiology Management (Orders, Reports, Images)
8. Pharmacy Management (Dispensing, Inventory)
9. OT Management (Scheduling, Rosters)
10. Billing & Payments
11. Insurance Claims
12. Bed Management
13. Inventory Management
14. HR/Staff Management
15. Analytics & Reporting
16. Role-Based Access Control
17. Audit Logging

### AI Features:
1. **Revenue Leakage Detection (Priority)**
   - Detects unbilled services
   - Flags unbilled medicines
   - Identifies unusual billing patterns
   - Real-time alerts dashboard

2. **Predictive Analytics (Optional)**
   - OPD rush hour predictions
   - Bed occupancy forecasting
   - Lab workload forecasting
   - Resource planning insights

---

This PRD provides a complete blueprint for building the HIS system from scratch using MERN stack with AI integration. The structure is modular, scalable, and follows best practices for healthcare applications.