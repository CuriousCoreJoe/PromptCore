# PromptCore Monetization Strategy - Implementation Summary

## Overview

This document outlines the complete implementation of PromptCore's usage-based pricing strategy, which includes a **"Usage Tax"** system (internally called the "Efficiency Logic") and the **"Prompt Factory Hook"** to drive conversions.

---

## Strategy Summary

### The Core Concept

1. **The Hook**: Prompt Factory is completely unrestricted for free users, allowing them to generate massive value quickly and burn credits fast
2. **The Squeeze**: Once free users cross 100 credits of usage in a month, a 3x multiplier kicks in ("Standard Rate")
3. **The Upsell**: Subscribers get "Preferred Rate" (1x) with no penalties, plus access to high-value features (Vibe Code, Talk to Source)

### Tier Structure

| Tier | Price | Monthly Credits | Rate Multiplier | Key Features |
|------|-------|----------------|-----------------|--------------|
| **Standard (Free)** | $0 | 50 | 3x after 100 credits | Prompt Factory, Everyday, Media Gen |
| **Creator (Preferred)** | $8.99 | 1,000 | 1x (No penalty) | All modes unlocked, Workspace save |
| **Pro** | $14.99 | 2,500 | 1x (No penalty) | All features, Priority support |

---

## Implementation Details

### 1. Pricing Configuration (`/config/pricing.ts`)

**Status**: ✅ Complete

A centralized configuration file that defines:
- Subscription tiers with feature flags
- Base credit costs for each action
- The "Efficiency Logic" calculator
- Helper functions for rate tier messaging

**Key Functions**:
```typescript
calculateActionCost(baseCost, subscriptionStatus, monthlyUsage)
getRateTierMessage(subscriptionStatus, monthlyUsage)
hasFeatureAccess(feature, subscriptionStatus)
```

---

### 2. Backend - Chat Function (`/netlify/functions/chat.ts`)

**Status**: ✅ Complete

**Changes Made**:

1. **Monthly Credit Reset Logic** (Lines 213-228):
   - Automatically resets `monthly_usage` at the start of each month
   - Renews monthly credit allowance (50 for free, 1000 for lite, 2500 for pro)

2. **Feature Locks** (Lines 240-248):
   - Free users blocked from Vibe Code and Talk to Source
   - Returns 402 error with upgrade prompt

3. **Usage Multiplier** (Lines 300-329):
   - Calculates base cost per action type
   - Applies 3x multiplier for free users after 100 credits
   - Deducts credits and tracks monthly usage

4. **Rate Tier Messaging** (Lines 331-351):
   - Detects when user crosses the 100-credit threshold
   - Returns warning messages in API response
   - Provides context-aware upgrade prompts

**Rate Tier Messages**:
- ⚠️ **Approaching Threshold**: "You've used X credits this month. After 100, Standard Rate (3x) applies."
- 💡 **Above Threshold**: "You're on Standard Rate (3x cost). Upgrade to Lite for Preferred Rates."

---

### 3. Backend - Trigger Function (`/netlify/functions/trigger.ts`)

**Status**: ✅ Complete

**Changes Made** (Lines 40-95):

1. Fetches user profile with subscription status and monthly usage
2. Calculates Prompt Factory batch cost
3. Applies 3x multiplier for free users above threshold
4. Shows detailed error message if insufficient credits:
   ```
   "Insufficient credits. Standard Rate (3x) applies.
   Cost: X, Balance: Y. Upgrade to Lite for Preferred Rates."
   ```

---

### 4. Frontend - Mode Selector (`/components/ModeSelector.tsx`)

**Status**: ✅ Complete

**Changes Made**:

1. **Feature Lock UI**:
   - Vibe Code and Talk to Source show lock icon for free users
   - Disabled state with "Lite+ Required" tooltip
   - Visual indication (grayed out, cursor-not-allowed)

2. **User Experience**:
   - Users can see locked features but cannot access them
   - Clear visual hierarchy between available and premium modes

---

### 5. Frontend - Upgrade Page (`/UpgradePage.tsx`)

**Status**: ✅ Complete

**Changes Made**:

1. **Updated Tier Descriptions**:
   - **Standard (Free)**: Emphasizes the 3x rate warning
   - **Lite**: Highlights "Preferred Rate: No 3x penalty" as key benefit
   - **Pro**: Positions as power user tier with massive credit allowance

2. **Credit Pack Messaging**:
   - Added warning that free users pay Standard Rate (3x)
   - Encourages subscription for better value on credit packs

**Key Messaging**:
- Free: "⚠️ Standard Rate: 3x cost after 100 credits/month"
- Lite: "✨ Preferred Rate: No 3x penalty"
- Pro: "✨ Preferred Rate: No usage penalties"

---

### 6. Frontend - Sidebar (`/components/Sidebar.tsx`)

**Status**: ✅ Complete

**Changes Made**:

Added visual rate tier badges next to user profile:

- **Free Users**: Yellow badge showing "3x Rate" with tooltip explaining the penalty
- **Lite/Pro Users**: Green badge showing "Preferred" indicating no penalties
- Always visible reminder of rate status

---

## Credit Cost Structure

### Base Costs (Before Multiplier)

| Action | Base Cost | Notes |
|--------|-----------|-------|
| Chat Message | 1 credit | Standard conversation |
| Prompt Factory Batch | 5 credits | Generates ~5 prompts |
| App Build Prototype | 30 credits | Full Vibe Code app generation |
| Media Gen Prompt | 5 credits | Image/Video/Audio prompts |
| Talk to Source Query | 2 credits | Document analysis |

### Actual Costs for Free Users

| Usage Stage | Multiplier | Example: Factory Batch |
|-------------|-----------|------------------------|
| 0-100 credits used | 1x | 5 credits |
| 100+ credits used | 3x | 15 credits |

**Impact**: A $5 credit pack (500 credits) effectively becomes worth only ~167 credits for free users above threshold, while subscribers get full 500 credits.

---

## User Flow Examples

### Example 1: The Hooked Free User

1. **Day 1**: User signs up (50 free credits)
2. **Day 2**: Uses Prompt Factory twice (10 credits). Loves it.
3. **Day 3**: Tries Vibe Code → **Locked**. Sees upgrade prompt.
4. **Day 4**: Continues using Prompt Factory (40 more credits used)
5. **Day 5**: Buys $5 credit pack (500 credits)
6. **Day 10**: Uses 50 more credits → Crosses 100 threshold
7. **Day 11**: Gets warning: "⚠️ Standard Rate (3x) now applies"
8. **Day 15**: Notices credits draining faster (now 15 per batch vs 5)
9. **Decision**: Subscribe to Lite for $8.99 to get 1000 credits AND stop the 3x drain

### Example 2: The Smart Subscriber

1. **Day 1**: User signs up and immediately sees locked features
2. **Day 1**: Upgrades to Lite ($8.99) to unlock everything
3. **Ongoing**: Uses 1000 credits/month at consistent 1x rates
4. **Result**: Gets 10x more value than free users hitting the tax

---

## Database Schema Changes

**Status**: ✅ Already Implemented

The profiles table already includes:

```sql
profiles (
  id UUID PRIMARY KEY,
  credits INTEGER DEFAULT 100,
  monthly_usage INTEGER DEFAULT 0,
  last_usage_reset TIMESTAMPTZ DEFAULT NOW(),
  subscription_status TEXT DEFAULT 'free', -- 'free', 'lite', 'pro'
  lifetime_prompts INTEGER DEFAULT 0,
  ...
)
```

**No schema changes required** - all necessary fields are already in place!

---

## Testing Checklist

### Backend Testing

- [ ] Test monthly usage reset logic (simulate month change)
- [ ] Verify 3x multiplier kicks in at 101 credits for free users
- [ ] Verify subscribers always pay 1x regardless of usage
- [ ] Test feature locks (Vibe Code, Talk to Source for free users)
- [ ] Test credit deduction accuracy with multiplier
- [ ] Verify Prompt Factory remains unrestricted for free users

### Frontend Testing

- [ ] Verify locked modes show lock icon for free users
- [ ] Test rate tier badges display correctly in sidebar
- [ ] Verify upgrade page messaging is clear and compelling
- [ ] Test mode selector disables locked features
- [ ] Verify rate tier warnings appear in chat at correct thresholds

### User Experience Testing

- [ ] Simulate free user journey (sign up → use factory → hit threshold → see 3x)
- [ ] Test upgrade flow from free to lite
- [ ] Verify credit pack purchases work correctly
- [ ] Test that dev account bypasses all restrictions

---

## Key Metrics to Track

1. **Conversion Triggers**:
   - % of free users who hit 100-credit threshold
   - % of users who upgrade after seeing 3x rate warning
   - % of users who buy credit packs vs subscribe

2. **Feature Engagement**:
   - Prompt Factory usage (the hook)
   - Attempts to access locked features (conversion intent)
   - Credit burn rate by tier

3. **Revenue Optimization**:
   - Average credits used per free user before/after threshold
   - Subscription upgrade rate after threshold warning
   - Credit pack purchase rate by tier

---

## Developer Notes

### Environment Variables Required

All existing environment variables are sufficient. The implementation uses:
- `SUPABASE_URL` / `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INNGEST_EVENT_KEY`
- `GEMINI_API_KEY` / `LOCAL_GEMINI_KEY`

### Dev Bypass

The dev account (`dev@promptcore.com`) bypasses:
- All credit charges
- Feature locks
- Usage multipliers
- Monthly allowances

Check implemented in both `chat.ts` and `trigger.ts` (lines 230-237 and 89-91 respectively).

---

## Rollout Strategy

### Phase 1: Silent Deploy (Recommended)
1. Deploy all changes to production
2. Monitor error rates and user feedback
3. Existing free users automatically subject to new pricing
4. No announcement needed - pricing page explains everything

### Phase 2: Communication
1. Add banner to dashboard for free users nearing threshold
2. Email campaign highlighting Lite benefits
3. Social proof: "Join 1000+ creators on Preferred Rate"

### Phase 3: Optimization
1. A/B test threshold value (100 vs 150 credits)
2. A/B test multiplier (3x vs 2.5x vs 4x)
3. Test different messaging for threshold warnings

---

## Pricing Psychology

### Why This Works

1. **Reciprocity**: Free users get genuine value from Prompt Factory first
2. **Loss Aversion**: Once they see credits draining 3x faster, upgrading feels like "saving money" not spending
3. **Anchoring**: $8.99/mo seems cheap compared to constantly buying $5 credit packs
4. **Immediate Benefit**: Unlock features + remove penalty = instant gratification

### The "Efficiency" Framing

Instead of calling it a "penalty" or "hidden fee," we frame it as:
- "Standard Rate" vs "Preferred Rate"
- Makes subscribers feel smart ("I'm getting preferred pricing")
- Makes free users feel they're leaving money on the table

---

## Success Metrics (Target)

- **Conversion Rate**: 15-25% of free users who cross threshold upgrade within 7 days
- **ARPU Increase**: 3x increase in average revenue per user
- **Retention**: Subscribers stay 2-3x longer than credit pack buyers
- **NPS**: Maintain >40 despite pricing pressure (transparent model)

---

## Files Changed Summary

| File | Status | Description |
|------|--------|-------------|
| `/config/pricing.ts` | ✅ Created | Centralized pricing configuration |
| `/netlify/functions/chat.ts` | ✅ Modified | Added multiplier logic and messaging |
| `/netlify/functions/trigger.ts` | ✅ Modified | Added multiplier for Factory |
| `/components/ModeSelector.tsx` | ✅ Modified | Added feature lock UI |
| `/components/UpgradePage.tsx` | ✅ Modified | Updated tier messaging |
| `/components/Sidebar.tsx` | ✅ Modified | Added rate tier badges |

---

## Next Steps (Optional Enhancements)

1. **Usage Dashboard**: Show free users a graph of credit consumption rate before/after threshold
2. **Smart Notifications**: Push notification when user is 10 credits away from threshold
3. **Referral Program**: "Get 100 bonus credits per referral" (encourages word-of-mouth)
4. **Annual Plans**: Offer 20% discount for annual subscriptions
5. **Enterprise Tier**: Custom pricing for teams (1000+ credits/mo needs)

---

## Support Resources

### For Users
- Updated FAQ explaining Standard vs Preferred rates
- Knowledge base article: "Why did my costs increase?"
- Live chat support for conversion questions

### For Team
- Dashboard to monitor threshold crossings in real-time
- Alert system for sudden drops in conversion rate
- A/B testing framework for pricing experiments

---

## Implementation Date
**January 9, 2026**

## Implementation Status
🟢 **COMPLETE AND READY FOR DEPLOYMENT**

All core features are implemented and integrated. System is production-ready pending final testing.

---

*This implementation follows industry best practices for SaaS pricing optimization, similar to strategies used by OpenAI (usage tiers), Anthropic (rate limiting), and other AI platforms.*
