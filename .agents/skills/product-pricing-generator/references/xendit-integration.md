# Xendit Integration Guide

## Overview
This guide covers how to export product pricing data to Xendit for payment processor configuration, subscription billing, and recurring revenue management.

## Xendit Product Schema

### Creating Products in Xendit
Xendit organizes pricing through `Invoices`, `Subscriptions`, and `Plans`. Here's the mapping:

```json
{
  "external_id": "unique-product-id",
  "payer_email": "customer@example.com",
  "description": "Product name and tier",
  "amount": 100000,
  "currency": "IDR",
  "invoice_expiry_date": "ISO 8601",
  "items": [
    {
      "name": "Fitness Assessment - Pro",
      "quantity": 1,
      "unit_price": 100000
    }
  ],
  "customer": {
    "given_names": "Customer Name",
    "email": "customer@example.com",
    "mobile_number": "+62xxx"
  },
  "fees": [
    {
      "type": "XENDIT_ADMIN_FEE",
      "value": 5000
    }
  ]
}
```

### Volume Tier Mapping
For volume-based pricing, create separate invoice items or subscription plans:

```json
{
  "subscription_id": "sub_fitness_pro_monthly",
  "customer_id": "cust_12345",
  "plan_id": "plan_fitness_pro",
  "amount": 1500000,
  "currency": "IDR",
  "interval": "MONTH",
  "interval_count": 1,
  "metadata": {
    "tier": "professional",
    "features": ["advanced_analytics", "priority_support"],
    "volume_discount_applied": false
  }
}
```

## Implementation Steps

### 1. Extract Pricing from Product-Pricing-Generator
After generating pricing using the skill, export as JSON:

```json
[
  {
    "productId": "fitness-assessment-starter",
    "name": "Fitness Assessment - Starter",
    "basePrice": 500000,
    "currency": "IDR",
    "tier": "starter",
    "discounts": []
  },
  {
    "productId": "fitness-assessment-pro",
    "name": "Fitness Assessment - Professional",
    "basePrice": 1500000,
    "currency": "IDR",
    "tier": "professional",
    "discounts": [
      { "type": "volume", "minQty": 5, "discountPercent": 10 }
    ]
  }
]
```

### 2. Create Xendit Plans
Use Xendit Create Plan API:

```bash
POST https://api.xendit.co/recurring/plans
Authorization: Basic {BASE64(SECRET_KEY:)}
Content-Type: application/json

{
  "external_id": "plan_fitness_assessment_pro",
  "billing_cycle": "MONTHLY",
  "amount": 1500000,
  "currency": "IDR",
  "subscription_count": 100,
  "description": "Fitness Assessment - Professional Tier",
  "success_redirect_url": "https://yourapp.com/success",
  "failure_redirect_url": "https://yourapp.com/failure",
  "metadata": {
    "tier": "professional",
    "product_tier": "professional"
  }
}
```

### 3. Configure Subscription & Invoicing
When customer purchases:
1. Create subscription from plan
2. Invoice customer with tiered amount
3. Log transaction to Firestore
4. Send receipt via email service

**Example Flow (TypeScript)**:
```typescript
// In paymentService.ts
const createSubscription = async (
  customerId: string,
  planId: string,
  amount: number
) => {
  const response = await fetch('https://api.xendit.co/recurring/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(xenditSecretKey).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_id: `sub_${customerId}_${Date.now()}`,
      plan_id: planId,
      customer_email: customerEmail,
      // Apply volume discount if applicable
      amount: calculateFinalPrice(amount, volumeDiscount)
    })
  });
  return response.json();
};
```

### 4. Handle Volume Discounts in Xendit

For volume discounts, create separate plan variations:

```json
{
  "external_id": "plan_fitness_assessment_pro_bulk",
  "billing_cycle": "MONTHLY",
  "amount": 1350000,
  "currency": "IDR",
  "description": "Fitness Assessment - Professional (10+ units)",
  "metadata": {
    "tier": "professional",
    "volume_discount_percent": 10,
    "min_quantity": 10
  }
}
```

Then apply routing logic in `paymentService.ts`:
```typescript
const selectedPlan = quantity >= 10 
  ? 'plan_fitness_assessment_pro_bulk'
  : 'plan_fitness_assessment_pro';
```

## Firestore Schema for Pricing

Store pricing configurations in Firestore for real-time reference:

```
/pricing_configs/{productId}
  - basePrice: number
  - currency: string
  - tier: string
  - xenditPlanId: string
  - discountRules: array
  - volumeTiers: array
  - lastUpdated: timestamp
  - metadata: object
```

**Document example**:
```json
{
  "basePrice": 1500000,
  "currency": "IDR",
  "tier": "professional",
  "xenditPlanId": "plan_fitness_assessment_pro",
  "discountRules": [
    {
      "type": "volume",
      "minQty": 5,
      "discountPercent": 10,
      "xenditPlanId": "plan_fitness_assessment_pro_bulk"
    }
  ],
  "volumeTiers": [
    { "minQty": 1, "maxQty": 4, "price": 1500000 },
    { "minQty": 5, "maxQty": null, "price": 1350000 }
  ],
  "lastUpdated": "2026-07-25T10:00:00Z"
}
```

## Testing Xendit Integration

1. **Development**: Use Xendit sandbox credentials
   ```typescript
   const xenditSecretKey = process.env.XENDIT_SECRET_KEY_SANDBOX;
   ```

2. **Test invoice creation**:
   ```bash
   curl -X POST https://api.sandbox.xendit.co/v2/invoices \
     -H "Authorization: Basic {{BASE64_ENCODED_KEY}}" \
     -d "external_id=test_inv_001&amount=100000&email=test@example.com"
   ```

3. **Webhook validation**: Verify signature in payment webhook
   ```typescript
   const calculateWebhookSignature = (webhookToken, webhookId) => {
     return crypto
       .createHmac('sha256', xenditSecretKey)
       .update(`${webhookId}${webhookToken}`)
       .digest('hex');
   };
   ```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Invoice not created | Check `external_id` uniqueness and amount format (must be integer) |
| Plan subscription fails | Verify `plan_id` exists and `customer_email` is valid |
| Webhook not received | Check Firebase function URL is whitelisted in Xendit dashboard |
| Discount not applied | Ensure correct plan ID routed based on volume; test in sandbox first |

---

**References**:
- [Xendit API Documentation](https://xendit.co/en/api-documentation/)
- [Xendit Recurring API](https://xendit.co/en/api-documentation/#recurring)
- See `functions/src/paymentService.ts` for implementation example
