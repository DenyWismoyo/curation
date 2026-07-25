# Pricing Strategy Guide

## Overview
This guide covers best practices for generating product pricing using the product-pricing-generator skill. Pricing strategy directly impacts profitability, market competitiveness, and customer satisfaction.

## 1. Pricing Strategies

### Fixed Margin Strategy
**When to use**: Standardized products with consistent costs across units.

- Apply a fixed margin percentage across all price tiers
- Formula: `Price = Cost × (1 + Margin%)`
- Pros: Simple, predictable, easy to scale
- Cons: Ignores market positioning and competitor dynamics

**Example**:
- Cost: $50
- Target Margin: 35%
- Price: $50 × 1.35 = $67.50

### Competitive Strategy
**When to use**: Markets with established competitors or price-sensitive segments.

- Research competitor pricing for similar products
- Price slightly below competitors (if market share is goal) or at parity (if margin is goal)
- Adjust margin based on differentiation (features, quality, support)
- Formula: `Price = Competitor Price ± Adjustment`

**Example**:
- Competitor Price: $80
- Our Advantage: Better support (justifies +5%)
- Our Price: $80 × 1.05 = $84

### Value-Based Strategy
**When to use**: Premium products, unique value propositions, or enterprise segments.

- Price based on customer-perceived value, not cost
- Research customer willingness-to-pay (surveys, interviews)
- Set price at 70-80% of perceived value to capture opportunity
- Formula: `Price = Perceived Value × 0.75`

**Example**:
- Customer perceived value: $200
- Recommended price: $200 × 0.75 = $150
- Cost: $40 → Margin: 73% ✓

## 2. Margin Calculations

### Margin vs. Markup
- **Margin %**: `(Price - Cost) / Price × 100`
- **Markup %**: `(Price - Cost) / Cost × 100`

**Example**:
- Cost: $50, Price: $100
- Margin: $(100-50)/100 = 50%
- Markup: $(100-50)/50 = 100%

### Healthy Margin Ranges by Segment

| Segment | Typical Margin | Rationale |
|---------|---|---|
| Commodity/B2B | 10-20% | High volume, price-sensitive |
| Mid-Market SaaS | 60-80% | Recurring revenue, support costs |
| Enterprise | 70-85% | Custom support, implementation |
| Physical Products | 30-50% | Manufacturing, inventory, logistics |
| Digital Products | 80-95% | Low COGS, scalable |

## 3. Discount Policies

### Volume-Based Discounts
Incentivize larger purchases while maintaining profitability.

**Structure**:
- 1-9 units: 0% discount (base price)
- 10-49 units: 10% discount
- 50+ units: 15% discount

**Formula for margin floor**: `New Price = Base Price × (1 - Discount%) ≥ Cost × (1 + Floor Margin%)`

### Time-Limited (Launch/Promotional) Discounts
Use for market entry or inventory clearance.

- **Launch discount**: 15-25% for first 30 days
- **Flash sale**: 20-40% for 48-72 hours
- **Seasonal**: 10-30% during off-peak periods

**Caution**: Avoid training customers to expect discounts; set clear expiration.

### Loyalty Discounts
Reward repeat customers and increase LTV.

- **Tier 1** (spent $0-1000): 0% discount
- **Tier 2** (spent $1001-5000): 5% discount
- **Tier 3** (spent $5000+): 10% discount

## 4. Volume Tier Pricing

### Examples

**SaaS Subscription Tiers** (Indonesian market):
- Starter: Rp 500K/month (basic features)
- Professional: Rp 1.5M/month (advanced features, 20% effective discount vs. starter per unit if buying 3+ months)
- Enterprise: Custom (negotiated)

**Physical Product Tiers**:
- Retail: $100/unit (1-9 units)
- Wholesale: $75/unit (10-49 units) = 25% discount
- Distribution: $60/unit (50+ units) = 40% discount

## 5. Validation Checklist

Before deploying pricing:

- [ ] Margin ≥ minimum floor for all tiers/discounts
- [ ] Discounts don't violate company policy (e.g., max combined 50%)
- [ ] Volume tiers are achievable (realistic break points)
- [ ] Competitor prices checked within last 30 days
- [ ] COGS data is current (±30 days)
- [ ] Pricing aligns with brand positioning (premium vs. budget)
- [ ] Currency and regional tax implications considered

## 6. Indonesia-Specific Considerations

- **Currency**: IDR typically; consider USD for B2B tech
- **Regional pricing**: Java/metro areas may tolerate higher prices than regions
- **Payment methods**: Account for Xendit fees (~1-2% per transaction)
- **Tax**: Add PPN (Value Added Tax) if applicable (usually 10%)
- **Seasonality**: End of month/quarter sees different purchasing patterns

## 7. Integration with Xendit

Export pricing data in Xendit format to:
- Create product catalogs
- Configure recurring billing (subscriptions)
- Set up multi-channel payment options (e-wallet, bank transfer, credit card)

See [xendit-integration.md](./xendit-integration.md) for export schemas.

---

**References**:
- Cost of Goods Sold (COGS) should be tracked in finance system
- Competitive pricing snapshots: Update quarterly via web scraping or manual research
- Customer willingness-to-pay: Conduct surveys or analyze historical conversion rates
