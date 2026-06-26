# Campaign Variant Pricing Checklist

## Goal

Change campaign pricing management from "price registration status" to "campaign inclusion plus optional variant-level discount".

## Data Policy

- Use variants as the actual pricing and selling unit.
- Keep the existing schema for this round.
- Treat the project `ALWAYS_ON` campaign `BASE` price list as the canonical variant base price source.
- Store campaign inclusion in `v2_campaign_targets`.
- Store campaign-specific discounted or direct prices as `OVERRIDE` price list items.
- When a campaign-included variant has no override, use the variant base price.
- When a variant has no base price, keep it out of sellable campaign exposure and show it as needing base price setup.
- For new discount operations, store the operator input in `v2_price_list_items.metadata` when possible:

```json
{
  "pricing_mode": "PERCENT_DISCOUNT",
  "discount_value": 10,
  "base_amount": 10000
}
```

## Admin UI Checklist

- Rename the current "price registered / unregistered" concept to campaign inclusion states.
- Show products as accordion groups to avoid expanding every variant by default.
- In each product accordion, show each variant with:
  - base price
  - campaign inclusion state
  - campaign override or discount state
  - effective campaign price
  - include/exclude action
  - discount type and value controls
- Split states into:
  - campaign included, using base price
  - campaign included, discount or direct price applied
  - campaign not included
  - base price missing
- Allow product-level bulk actions as UI shortcuts only:
  - include all variants
  - exclude all variants
  - apply the same discount to all priced variants
- Disable include/discount controls for variants without a base price.

## Backend Checklist

- For explicit campaign shop queries, expose only variants included by the selected campaign targets.
- Prefer campaign `OVERRIDE` price items when present.
- Fall back to the variant `BASE` price when no campaign override exists.
- Do not fall back to unrelated campaign prices.
- Keep non-campaign shop behavior stable unless a campaign is explicitly selected.
- Return enough admin summary data to distinguish inclusion, base fallback, override, and missing base states.

## Verification Checklist

- A campaign can include 10 variants while only 1 has an override price.
- The 1 override variant displays the campaign price.
- The 9 non-override variants display base prices inside the campaign.
- Variants with no base price are not treated as sellable.
- Multi-variant products can have independent include and discount states per variant.
- Campaign expiration returns storefront pricing to base behavior.
- Product list, product detail, cart, and checkout use consistent effective prices.
