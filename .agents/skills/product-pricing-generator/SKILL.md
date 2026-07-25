---
name: product-pricing-generator
description: "Generate pricing tiers, pricing matrices, and pricing documents for new products. Use for: setting up pricing for a new product; creating multi-tier pricing structures; generating pricing documents with discounts and volume-based rules; preparing pricing data for payment processors (Xendit); calculating margins and competitive pricing strategies."
argument-hint: "Product name, cost basis, and target market"
user-invocable: true
---

# Product Pricing Generator

## When to Use

- **New product launch**: Define pricing tiers and create pricing documentation
- **Pricing restructure**: Generate new pricing matrices with different margin strategies
- **Multi-tier products**: Create tiered pricing for SaaS, subscriptions, or volume-based offerings
- **Document generation**: Produce PDF pricing documents with discounts and competitor analysis
- **Payment processor setup**: Export pricing data in Xendit-compatible format

## Core Workflow

### 1. Define Product & Cost Basis
Provide product name, cost basis, and target market segment. The skill uses this to determine pricing tier placement and margin targets.

### 2. Generate Pricing Tiers
Choose pricing strategy: fixed margin, competitive analysis, or value-based pricing. Generate pricing tiers with base price, discount rules, and volume breaks.

### 3. Apply Business Rules
Configure discounts (volume-based, time-limited), minimum order quantities, and margin floor. The skill validates profitability constraints.

### 4. Generate Output Documents
Create pricing matrices, PDF pricing sheets, or JSON export formats. Supports:
- Pricing matrices (HTML/CSV) for internal use
- PDF pricing documents (brand-compliant, ready for customers)
- Xendit product configurations for payment processor setup

### 5. Export & Deploy
Export pricing data to:
- Firestore pricing collections
- Xendit product catalog
- External CRM or billing systems

## Procedure

### Step 1: Gather Product Information
Collect the following inputs:
- Product name and description
- Cost basis (COGS or unit cost)
- Target market segment
- Competitor pricing (if available)
- Desired margin range (e.g., 30-40%)

Use [Product Input Template](./templates/product-input.json) to standardize data.

### Step 2: Calculate Pricing Tiers
Run [pricing tier generator script](./scripts/generatePricingTiers.ts) with product data:
```
generatePricingTiers(productData, strategyConfig)
```

Strategies:
- **Fixed Margin**: Apply consistent margin % across all tiers
- **Competitive**: Match competitor pricing with local adjustments
- **Value-Based**: Price based on perceived value and segment willingness-to-pay

### Step 3: Configure Discount Rules
Define volume-based, time-limited, or promotional discounts using [discount configuration](./templates/discount-rules.json):
- Volume breaks (e.g., 10+ units: 10% off)
- Promotional periods (e.g., launch discount: 20% for first month)
- Minimum order quantities and margin floor constraints

### Step 4: Generate Pricing Document
Use [pricing document generator](./scripts/generatePricingDocument.ts) to produce:
- **CSV Export**: For spreadsheet analysis and Firestore import
- **PDF**: Brand-compliant pricing sheet for customer distribution
- **JSON**: Xendit product format for payment processor

### Step 5: Validate & Review
Checklist before deployment:
- [ ] All tiers meet margin floor constraints
- [ ] Volume discounts follow company policy
- [ ] Competitor pricing within market range
- [ ] Pricing document reflects brand guidelines
- [ ] Xendit export contains valid product data

### Step 6: Deploy to System
- Upload pricing data to Firestore `pricing_configs` collection
- Configure in Xendit dashboard via API
- Distribute PDF pricing sheets to sales team

## Reference Resources

- [Pricing Strategy Guide](./references/pricing-strategy.md) — Best practices for margin calculation, discount policies, and competitor analysis
- [Xendit Integration](./references/xendit-integration.md) — Exporting pricing to Xendit, validating product data
- [Firestore Schema](./references/firestore-schema.md) — Pricing collection structure, indexing, and query patterns

## Common Workflows

### Quick Pricing Setup
For fast product launches: Product name + cost → Generate fixed-margin tiers → PDF export

### Competitive Pricing
Input competitor prices → Generate value-based tiers → Compare margin vs. market → Export

### Volume-Based Tiering
Define tier quantities (1-9, 10-49, 50+) → Calculate cost savings → Apply volume discounts → Document for customers

## Integration Points

- **Firestore**: Save pricing configurations in `products/{productId}/pricing` subcollection
- **Xendit**: Export product data via Xendit API (see [xendit-integration.md](./references/xendit-integration.md))
- **Payment Service**: Reference pricing from `functions/src/paymentService.ts` when charging customers
- **AI Prompts**: Use pricing templates from `src/data/aiPromptTemplates.tsx` for dynamic pricing strategies

## Example Use Case

**Scenario**: Launch a new fitness assessment subscription with 3 tiers (Basic, Pro, Premium).

1. Input: Basic cost $50/month, target margins 35% (Pro), 40% (Premium)
2. Generate: Basic $80, Pro $130, Premium $199
3. Add volume discount: Buy 5+ subscriptions, 10% off
4. Generate PDF pricing sheet and send to sales
5. Export to Firestore and Xendit for billing

---

**Status**: Ready for implementation. Consider creating example templates and scripts for your Xendit integration workflow.
