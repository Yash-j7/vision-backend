# HDFC Payment Gateway Integration

This document explains the HDFC payment gateway integration that has been added to the backend.

## Files Added

### 1. `PaymentHandler.js`
- **Location**: `Backend/PaymentHandler.js`
- **Purpose**: Core payment processing logic for HDFC gateway
- **Features**:
  - Order session creation
  - Payment status checking
  - Refund processing
  - HMAC signature validation
  - Comprehensive logging

### 2. `hdfc-config.json`
- **Location**: `Backend/hdfc-config.json`
- **Purpose**: Configuration file for HDFC payment gateway
- **Current Settings**:
  - **Environment**: UAT (Sandbox)
  - **Base URL**: `https://smartgatewayuat.hdfcbank.com`
  - **Client ID**: `hdfcmaster` (demo configuration)
  - **Merchant ID**: `SG3035`

## API Endpoints

### 1. Initiate HDFC Payment
- **Endpoint**: `POST /api/v1/payment/hdfc/initiate`
- **Purpose**: Creates a payment session and redirects to HDFC payment page
- **Request Body**:
  ```json
  {
    "amount": 100,
    "customer": {
      "customer_id": "user123",
      "customer_email": "user@example.com",
      "customer_phone": "9876543210",
      "customer_name": "John Doe"
    },
    "orderId": "ORD123456789",
    "redirectUrl": "http://localhost:5173/payment/callback"
  }
  ```

### 2. HDFC Payment Callback
- **Endpoint**: `POST /api/v1/payment/hdfc/callback`
- **Purpose**: Handles payment response from HDFC gateway
- **Request Body**:
  ```json
  {
    "order_id": "ORD123456789",
    "status": "CHARGED",
    "signature": "hmac_signature_here"
  }
  ```

## Configuration

### Current Configuration (Demo)
The current setup uses HDFC's demo configuration which limits available banks. To get full bank support:

1. **Contact HDFC Bank** for production credentials
2. **Update `hdfc-config.json`** with production values:
   ```json
   {
     "API_KEY": "YOUR_PRODUCTION_API_KEY",
     "MERCHANT_ID": "YOUR_PRODUCTION_MERCHANT_ID",
     "PAYMENT_PAGE_CLIENT_ID": "YOUR_PRODUCTION_CLIENT_ID",
     "BASE_URL": "https://smartgateway.hdfcbank.com",
     "ENABLE_LOGGING": true,
     "LOGGING_PATH": "./logs/PaymentHandler.log",
     "RESPONSE_KEY": "YOUR_PRODUCTION_RESPONSE_KEY"
   }
   ```

## Known Issues

### Limited Bank Options
- **Problem**: Only Avenue bank shows in netbanking section
- **Cause**: Using demo `PAYMENT_PAGE_CLIENT_ID: "hdfcmaster"`
- **Solution**: Get production credentials from HDFC Bank

### Environment
- **Current**: UAT/Sandbox environment
- **Production**: Requires production credentials and URL

## Logging

Payment transactions are logged to:
- **File**: `Backend/logs/PaymentHandler.log`
- **Format**: Timestamp, API Tag, Request ID, Message, Value
- **Enabled**: Yes (configurable in `hdfc-config.json`)

## Security

- **HMAC Signature Validation**: All callbacks are validated using HMAC-SHA256
- **API Key Authentication**: All requests use Basic Auth with API key
- **Response Key**: Used for signature verification

## Testing

### Test Card Details
- **Card Number**: 4012000000001097
- **CVV**: 123
- **Expiry**: Any future date

### Demo Environment
- **Base URL**: `https://smartgatewayuat.hdfcbank.com`
- **Purpose**: Testing and development only

## Integration Status

✅ **Completed**:
- PaymentHandler.js integrated
- Configuration file added
- API endpoints implemented
- Import paths updated

⚠️ **Pending**:
- Production credentials from HDFC
- Full bank list configuration
- Production environment setup 