# Payme Integration Test Guide

## Configuration

### Test Mode (Development)
- **Merchant ID**: `C@@TTQqZfvjXmmTFR0p54B@i9mhdz8GIzMmw`
- **Checkout URL**: `https://checkout.test.paycom.uz`
- **Test Mode Badge**: Yellow "TEST MODE" badge visible in UI

### Production Mode
- **Merchant ID**: `6899d73ecab302211ad27f12`
- **Checkout URL**: `https://checkout.paycom.uz`

## Payment Flow

### 1. Booking Creation
- User selects service and clinic
- User chooses date/time
- User fills booking form
- Redirects to `/payment` with booking data

### 2. Appointment Creation
- POST `/api/user/appointments` with:
  ```json
  {
    "clinicId": "uuid",
    "serviceType": "DIAGNOSTIC",
    "diagnosticServiceId": "uuid",
    "scheduledAt": "ISO date string",
    "price": 50000,
    "notes": "optional"
  }
  ```
- Returns appointment with `PENDING` status
- Appointment ID used as `order_id` for Payme

### 3. Payment Page
- Shows order summary (clinic, service, date, price)
- Displays appointment ID (first 8 chars)
- POST form submits to Payme checkout with:
  - `merchant`: Merchant ID
  - `amount`: Price in tiyin (UZS × 100)
  - `account[order_id]`: Appointment ID
  - `lang`: uz
  - `callback`: Return URL

### 4. Payme Checkout
- User enters card details on Payme's secure page
- Payme processes payment
- Redirects back to callback URL

### 5. Payment Result
- URL: `/payment/result?order_id={appointmentId}`
- Backend webhook updates appointment status
- Shows success/failure message

## Test Cards (Payme Test Environment)

### Successful Payment
- Card: `8600 4954 1234 5678`
- Expiry: Any future date
- CVV: Any 3 digits

### Failed Payment
- Card: `8600 0000 0000 0000`
- Will simulate payment failure

## Backend Webhook

Payme will call your backend webhook at:
```
POST /api/payme/webhook
```

Ensure this endpoint:
1. Verifies Payme signature
2. Updates appointment status to `CONFIRMED` on success
3. Updates to `CANCELLED` on failure
4. Returns proper JSON-RPC 2.0 response

## Testing Checklist

- [ ] Appointment creation works (no 400 errors)
- [ ] Price converted to number correctly
- [ ] Duplicate booking logic works (reuses PENDING appointments)
- [ ] Payment page shows TEST MODE badge
- [ ] Form submits to test.paycom.uz
- [ ] Merchant ID is test key in development
- [ ] Callback URL includes appointment ID
- [ ] Payment result page handles success/failure

## Known Issues Fixed

1. ✅ Price type mismatch (was string, now number)
2. ✅ Duplicate booking error (now reuses PENDING appointments)
3. ✅ PointerEvent in navigate state (XizmatDetailPage fixed)
4. ✅ Patient cookie contaminating admin auth (separate cookie paths)
5. ✅ Admin login credentials (admin@medicare.uz / admin123)

## Current Status

**Payment integration is ready for testing.**

Navigate to any service → Click "Bron qilish" → Fill form → Proceed to payment → Test with Payme test cards.
