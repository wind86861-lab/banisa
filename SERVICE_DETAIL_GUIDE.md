# Service Detail Page - Complete Guide

## Current Status ✅

The service detail page is **fully implemented** with a modern blog-style 2-column layout. All backend and frontend code is ready to display comprehensive service information.

## Architecture

### 1. **Super Admin Responsibilities** (Services.jsx - 6-step form)

The super admin creates and manages diagnostic services through `/admin/services` with these fields:

#### Step 1: Basic Information
- Service names (UZ, RU, EN)
- Category selection
- Short description (200 chars)
- Full description

#### Step 2: Price & Time
- Price range (min, recommended, max)
- Duration in minutes
- Result time in hours

#### Step 3: Technical Details
- Sample type (e.g., "Venoz qon")
- Sample volume (e.g., "5 ml")
- Result format (e.g., "PDF, Online")
- **Process description** (Jarayon tavsifi - how the procedure works)
- Result parameters (name, description, normal range)

#### Step 4: Preparation Instructions
- General preparation text
- Fasting hours
- Water allowed (yes/no)
- Alcohol restriction hours
- Smoking restriction hours
- Medications to stop
- Exercise restrictions
- Best time for test
- Special diet
- Women-specific warnings

#### Step 5: Indications & Contraindications
- **Symptoms** (when needed) - comma-separated
- **Diseases** recommendations - comma-separated
- **Mandatory for** (who must take it) - comma-separated
- **Preventive** check description
- General contraindications text
- **Absolute** contraindications - comma-separated
- **Relative** contraindications - comma-separated
- **Temporary** contraindications - comma-separated

#### Step 6: Additional Information
- Modern equipment
- Accuracy percentage
- Experience years
- Daily capacity
- Certifications - comma-separated
- **Booking policy**:
  - Prepayment required (yes/no)
  - Cancellation policy
  - Modification policy

### 2. **Clinic Admin Responsibilities** (Clinic Dashboard)

Clinic admins can **customize** services they offer:
- Custom pricing (override super admin prices)
- Discount percentage
- Custom service names (UZ, RU)
- **Upload clinic-specific images** for the service
- Enable/disable service for their clinic

### 3. **Backend API** (`/api/public/services/:id`)

Returns complete service data including:
- All super admin fields (descriptions, preparation, indications, etc.)
- Aggregated images from service + all clinics
- List of clinics offering the service with:
  - Custom names (if set by clinic)
  - Custom prices and discounts
  - Clinic-specific images
  - Clinic contact info and ratings

### 4. **Frontend Display** (XizmatDetailPage.jsx)

**Blog-style 2-column layout:**

**Left Column (Main Content):**
- Featured image gallery with thumbnails
- Service description (nameRu, fullDescription)
- Process description blockquote (if exists)
- Preparation section with grid icons (if data exists)
- Result parameters table (if exists)
- Indications with colored tags (if exists)
- Contraindications with warning styling (if exists)
- Tags and share buttons
- Clinics list with booking buttons
- Related services cards

**Right Column (Sticky Sidebar):**
- **Booking card** (teal gradient):
  - Price display
  - "Qabulga yozilish" button
  - Like and share actions
- **General information box**:
  - Duration, result time
  - Sample type, volume
  - Result format
  - Number of clinics
  - Accuracy, equipment
  - Certifications
- **Booking policy box** (if exists)
- **Related services mini-cards**
- **Tags box**

## Why Some Sections Don't Show

The page uses **conditional rendering** - sections only appear if data exists:

```javascript
{svc.processDescription && <blockquote>...</blockquote>}
{hasPrep && <div className="xd-content-block">...</div>}
{params.length > 0 && <div>Result Parameters</div>}
{hasInd && <div>Indications</div>}
{hasContra && <div>Contraindications</div>}
```

**Current test service has:**
- ✅ Basic info (name, description)
- ✅ Price and time
- ✅ Sample type
- ✅ Images (2 images)
- ❌ Process description (null)
- ❌ Preparation details (null)
- ❌ Indications (null)
- ❌ Contraindications (null)
- ❌ Result parameters (null)
- ❌ Additional info (null)
- ❌ Booking policy (null)

## How to Fill Service Data

### Option 1: Through Admin Panel UI
1. Go to `/admin/services`
2. Click "Edit" on any service
3. Fill all 6 steps with complete information
4. Click "Saqlash" to save

### Option 2: Direct Database Update (for testing)
Use the test data in `/tmp/test_service_data.json` as a template.

## Example: Complete Service Data

See the JSON structure in `/tmp/test_service_data.json` for a fully populated service with:
- Process description
- Detailed preparation with 8 fields
- Indications with symptoms, diseases, mandatory groups, preventive info
- Contraindications (absolute, relative, temporary)
- 4 result parameters
- Additional info (equipment, accuracy, certifications)
- Booking policy (cancellation, modification rules)

## Role Separation Summary

| Field Category | Super Admin | Clinic Admin |
|---------------|-------------|--------------|
| Service details (name, description, process) | ✅ Creates & edits | ❌ Read-only |
| Technical specs (sample type, duration) | ✅ Sets defaults | ❌ Read-only |
| Preparation instructions | ✅ Defines | ❌ Read-only |
| Indications/Contraindications | ✅ Defines | ❌ Read-only |
| Result parameters | ✅ Defines | ❌ Read-only |
| Additional info & certifications | ✅ Defines | ❌ Read-only |
| Booking policy | ✅ Sets default | ❌ Read-only |
| **Pricing** | ✅ Sets range | ✅ Can customize |
| **Service images** | ✅ Can upload | ✅ Can upload clinic-specific |
| **Service names** | ✅ Sets default | ✅ Can customize for clinic |
| **Enable/Disable** | ✅ Can deactivate globally | ✅ Can disable for their clinic |

## Next Steps

To see all sections on the detail page:
1. Edit a service in admin panel
2. Fill all 6 steps completely
3. Save the service
4. Visit the detail page - all sections will now appear

The frontend is ready and will automatically display all fields when they have data!
