# Firestore Schema for Pricing

## Collections & Documents

### `/pricing_configs` Collection
Stores base pricing configuration for all products.

**Document ID**: `{productId}`

```json
{
  "productId": "fitness-assessment-pro",
  "productName": "Fitness Assessment - Professional",
  "description": "Professional-tier fitness assessment with advanced analytics",
  "costBasis": {
    "unitCost": 400000,
    "lastUpdated": "2026-07-20T00:00:00Z"
  },
  "basePrice": 1500000,
  "currency": "IDR",
  "tier": "professional",
  "pricingStrategy": "competitive",
  "xenditPlanId": "plan_fitness_assessment_pro",
  "margin": {
    "percentMargin": 73.33,
    "marginAmount": 1100000,
    "minimumFloor": 20
  },
  "discountRules": [
    {
      "type": "volume",
      "name": "Bulk Order Discount",
      "minQuantity": 5,
      "discountPercent": 10,
      "xenditPlanId": "plan_fitness_assessment_pro_bulk",
      "enabled": true
    }
  ],
  "volumeTiers": [
    {
      "minQuantity": 1,
      "maxQuantity": 4,
      "pricePerUnit": 1500000,
      "discountPercent": 0
    },
    {
      "minQuantity": 5,
      "maxQuantity": null,
      "pricePerUnit": 1350000,
      "discountPercent": 10
    }
  ],
  "constraints": {
    "minimumOrderQuantity": 1,
    "minimumMarginPercent": 20,
    "maximumDiscountPercent": 15
  },
  "competitorPricing": [
    {
      "competitor": "GFit",
      "productName": "Premium Assessment",
      "price": 1699000,
      "lastChecked": "2026-07-25T00:00:00Z"
    }
  ],
  "active": true,
  "createdAt": "2026-07-20T12:00:00Z",
  "updatedAt": "2026-07-25T10:00:00Z",
  "updatedBy": "admin@example.com",
  "metadata": {
    "launchDate": "2026-08-01T00:00:00Z",
    "promotionalEndDate": "2026-08-31T23:59:59Z",
    "region": "Indonesia"
  }
}
```

### `/pricing_history` Collection
Audit trail of pricing changes (optional but recommended).

**Document ID**: `{productId}_{timestamp}`

```json
{
  "productId": "fitness-assessment-pro",
  "version": 2,
  "previousPrice": 1600000,
  "newPrice": 1500000,
  "reason": "Competitive adjustment - GFit price match",
  "changedAt": "2026-07-25T10:00:00Z",
  "changedBy": "product-manager@example.com",
  "changes": {
    "basePrice": { "old": 1600000, "new": 1500000 },
    "margin": { "old": 75, "new": 73.33 }
  }
}
```

### `/products/{productId}/pricing` Subcollection
Denormalized pricing for quick access in product detail queries.

**Document ID**: `active` (or `{timestamp}` for history)

```json
{
  "basePrice": 1500000,
  "tier": "professional",
  "currency": "IDR",
  "displayName": "Professional - Rp 1.5M/month",
  "nextPriceChange": null,
  "appliedDiscounts": []
}
```

## Queries

### Get All Active Pricing Configs
```typescript
const allPricing = await db
  .collection('pricing_configs')
  .where('active', '==', true)
  .orderBy('tier')
  .get();
```

### Get Pricing by Tier
```typescript
const tierPricing = await db
  .collection('pricing_configs')
  .where('tier', '==', 'professional')
  .where('active', '==', true)
  .get();
```

### Get Pricing History for Product
```typescript
const history = await db
  .collection('pricing_history')
  .where('productId', '==', 'fitness-assessment-pro')
  .orderBy('changedAt', 'desc')
  .limit(10)
  .get();
```

## Security Rules

```
match /pricing_configs/{document=**} {
  allow read: if true; // Public pricing is readable
  allow write: if request.auth.uid != null && 
               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

match /pricing_history/{document=**} {
  allow read: if request.auth.uid != null && 
              get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'product_manager'];
  allow create: if request.auth.uid != null && 
                get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

## Indexes

Create composite index for common queries:

```
Collection: pricing_configs
Fields:
  - tier (Ascending)
  - active (Ascending)
  - updatedAt (Descending)
```

## Denormalization Strategy

**When to denormalize pricing**:
- Store `basePrice` in product documents for quick display
- Cache frequently accessed pricing tiers in memory or Redis
- Avoid deep nesting; keep pricing configs at top level

**When to normalize**:
- Store only reference to `pricing_config/{productId}` in orders for audit trail
- Query pricing history separately

---

**Implementation note**: Pricing configs should be cached client-side and refreshed on app startup or periodically (e.g., hourly) to avoid Firestore read overages.
