# PromptCore Monetization Strategy - Testing Guide

## Quick Test Scenarios

This guide helps you quickly verify the implementation is working correctly.

---

## Scenario 1: Free User - Below Threshold (Normal Rate)

**Setup**:
1. Create a test user account (not dev@promptcore.com)
2. Ensure user has `subscription_status = 'free'`
3. Ensure `monthly_usage < 100`

**Test Actions**:
1. Use Prompt Factory (should cost 5 credits per batch)
2. Send chat messages (should cost 1 credit each)
3. Check sidebar → Should see "3x Rate" yellow badge
4. Try to access Vibe Code → Should be locked with lock icon

**Expected Results**:
- ✅ Credits deducted at 1x rate
- ✅ Prompt Factory accessible
- ✅ Vibe Code and Talk to Source locked
- ✅ Yellow "3x Rate" badge visible in sidebar
- ✅ No warning messages yet

---

## Scenario 2: Free User - Crossing Threshold

**Setup**:
1. Use same free user from Scenario 1
2. Manually set `monthly_usage = 95` in database (or use naturally)

**Test Actions**:
1. Use Prompt Factory (5 credit action)
2. Check chat response for warning message
3. Use another action

**Expected Results**:
- ✅ First action completes normally (96-100 credits used)
- ✅ Warning message appears: "⚠️ You've used X credits this month. After 100, Standard Rate (3x) applies."
- ✅ Next action costs 3x (e.g., Prompt Factory now costs 15 credits)

---

## Scenario 3: Free User - Above Threshold (3x Rate)

**Setup**:
1. Use same free user
2. Ensure `monthly_usage > 100`

**Test Actions**:
1. Use Prompt Factory (should now cost 15 credits, not 5)
2. Send chat message (should cost 3 credits, not 1)
3. Check chat response for upgrade prompt

**Expected Results**:
- ✅ All actions cost 3x the base price
- ✅ Message in response: "💡 You're on Standard Rate (3x cost). Upgrade to Lite for Preferred Rates."
- ✅ Credits drain 3x faster than before
- ✅ Yellow "3x Rate" badge still visible

---

## Scenario 4: Lite Subscriber (Preferred Rate)

**Setup**:
1. Create a test user or upgrade existing user
2. Set `subscription_status = 'lite'`
3. Set `credits = 1000` (monthly allowance)

**Test Actions**:
1. Use Prompt Factory multiple times
2. Accumulate monthly_usage > 100
3. Continue using features
4. Check sidebar badge

**Expected Results**:
- ✅ Actions ALWAYS cost 1x rate (no multiplier)
- ✅ Vibe Code and Talk to Source unlocked
- ✅ Green "Preferred" badge in sidebar
- ✅ No warning messages about rates
- ✅ Credits deducted consistently regardless of monthly_usage

---

## Scenario 5: Pro Subscriber (Power User)

**Setup**:
1. Create test user with `subscription_status = 'pro'`
2. Set `credits = 2500`

**Test Actions**:
1. Use all modes (Everyday, Vibe Code, Media Gen, Talk to Source)
2. Build app prototypes (30 credits each)
3. Use Prompt Factory extensively

**Expected Results**:
- ✅ All features unlocked
- ✅ 1x rate applies to all actions
- ✅ Green "Preferred" badge in sidebar
- ✅ No usage penalties or warnings
- ✅ Can use high-cost features (App Builder at 30cr)

---

## Scenario 6: Monthly Reset

**Setup**:
1. Use any user with existing monthly_usage
2. Set `last_usage_reset` to last month in database
   ```sql
   UPDATE profiles
   SET last_usage_reset = '2025-12-01'
   WHERE id = 'user-id';
   ```

**Test Actions**:
1. Perform any action (chat, factory, etc.)

**Expected Results**:
- ✅ `monthly_usage` resets to 0
- ✅ `last_usage_reset` updates to current month
- ✅ Monthly credit allowance renewed:
  - Free: credits = max(current, 50)
  - Lite: credits = max(current, 1000)
  - Pro: credits = max(current, 2500)
- ✅ User starts fresh with 1x rate (if free)

---

## Scenario 7: Feature Lock UI

**Setup**:
1. Login as free user
2. Navigate to Workspace

**Test Actions**:
1. Look at Mode Selector at top
2. Try to click "Vibe Code"
3. Try to click "Talk to Source"
4. Hover over locked modes

**Expected Results**:
- ✅ Vibe Code shows lock icon
- ✅ Talk to Source shows lock icon
- ✅ Everyday and Media Gen are not locked
- ✅ Locked modes are grayed out (opacity-60)
- ✅ Locked modes have cursor-not-allowed
- ✅ Tooltip shows "Lite+ Required"
- ✅ Clicking locked mode does nothing

---

## Scenario 8: Upgrade Page Messaging

**Setup**:
1. Login as any user
2. Navigate to Upgrade page

**Test Actions**:
1. Review all three tiers
2. Check feature lists
3. Read credit pack descriptions

**Expected Results**:
- ✅ **Starter (Free)**:
  - Shows "Standard Rate" badge
  - Lists "⚠️ Standard Rate: 3x cost after 100 credits/month"
  - Highlights "Unlimited Prompt Factory Access"

- ✅ **Lite**:
  - Shows "Preferred Rate" badge
  - Lists "✨ Preferred Rate: No 3x penalty"
  - Lists unlocked features (Vibe Code, Talk to Source)

- ✅ **Pro**:
  - Shows "Best Value" badge
  - Lists "✨ Preferred Rate: No usage penalties"
  - Positions as power user tier

- ✅ **Credit Packs**:
  - Warning message mentions 3x rate for free users
  - Encourages subscription for better value

---

## Scenario 9: Dev Bypass

**Setup**:
1. Login with `dev@promptcore.com` account
2. Or set `NETLIFY_DEV=true` in local environment

**Test Actions**:
1. Use any features extensively
2. Check credit balance
3. Try locked features

**Expected Results**:
- ✅ NO credits deducted
- ✅ All features accessible regardless of subscription
- ✅ No multiplier applied (even if monthly_usage > 100)
- ✅ No feature locks apply
- ✅ Can test freely without worrying about credits

---

## Scenario 10: Insufficient Credits

**Setup**:
1. Set user credits to 2 (less than any action cost)
2. Ensure user is free with `monthly_usage > 100` (so 3x rate applies)

**Test Actions**:
1. Try to use Prompt Factory (would cost 15 credits)
2. Check error message

**Expected Results**:
- ✅ Request fails with 402 status
- ✅ Error message: "Insufficient credits. Top up your account or upgrade to a subscription plan for monthly credits."
- ✅ Action does not complete
- ✅ Credits not deducted

---

## Database Inspection Commands

Use these SQL queries to verify the implementation:

```sql
-- Check user's current status
SELECT
  id,
  credits,
  monthly_usage,
  subscription_status,
  last_usage_reset,
  lifetime_prompts
FROM profiles
WHERE id = 'user-id-here';

-- Find users who crossed threshold
SELECT
  id,
  credits,
  monthly_usage,
  subscription_status
FROM profiles
WHERE subscription_status = 'free'
  AND monthly_usage > 100;

-- Reset a user's monthly usage (for testing)
UPDATE profiles
SET monthly_usage = 0,
    last_usage_reset = NOW()
WHERE id = 'user-id-here';

-- Set user to test threshold crossing
UPDATE profiles
SET monthly_usage = 95
WHERE id = 'user-id-here';
```

---

## Network Request Testing

### Test Chat Endpoint

```bash
# Test as free user above threshold
curl -X POST https://your-app.netlify.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [],
    "input": "Test message",
    "userId": "user-id-here",
    "mode": "Everyday",
    "wizardMode": "iterative"
  }'
```

**Check Response**:
- Look for `rateTierInfo` in response
- Verify `multiplier` or `approaching` flags
- Check if warning message is present

### Test Trigger Endpoint

```bash
# Test Prompt Factory trigger
curl -X POST https://your-app.netlify.app/api/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "niche": "Test Topic",
    "count": 5,
    "userId": "user-id-here"
  }'
```

**Check Response**:
- If insufficient credits, error mentions "Standard Rate (3x)"
- Response includes pack ID if successful

---

## Browser Console Testing

Open browser console (F12) and run:

```javascript
// Check user profile in local state
console.log('Profile:', profile);
console.log('Subscription:', profile?.subscription_status);
console.log('Monthly Usage:', profile?.monthly_usage);

// Monitor credit updates via Supabase Realtime
supabase
  .channel('test-profile')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'profiles',
    filter: `id=eq.${userId}`
  }, (payload) => {
    console.log('Credits updated:', payload.new.credits);
    console.log('Monthly usage:', payload.new.monthly_usage);
  })
  .subscribe();
```

---

## Visual Checks

### Sidebar Badge Check

**Free User**:
- Yellow badge with "3x Rate" text
- Tooltip: "Costs increase 3x after 100 credits/month..."

**Lite/Pro User**:
- Green badge with "Preferred" text
- Tooltip: "Preferred Rate: No usage penalties"

### Mode Selector Check

**Free User**:
- Everyday: Unlocked (blue when active)
- Vibe Code: Locked (grayed out + lock icon)
- Media Gen: Unlocked (pink when active)
- Talk to Source: Locked (grayed out + lock icon)

**Lite/Pro User**:
- All modes unlocked
- No lock icons visible
- All modes clickable

---

## Common Issues & Debugging

### Issue: Multiplier not applying

**Check**:
1. Verify `subscription_status = 'free'` in database
2. Verify `monthly_usage > 100`
3. Check that user is not dev account
4. Look at backend logs for calculated `multiplier` value

### Issue: Monthly reset not working

**Check**:
1. Verify `last_usage_reset` is in past month
2. Check date comparison logic (month AND year)
3. Ensure timezone consistency

### Issue: Feature locks not showing

**Check**:
1. Verify `userProfile` prop is passed to ModeSelector
2. Check `profile?.subscription_status` value
3. Ensure Lock icon is imported from lucide-react
4. Check browser console for React errors

### Issue: Rate tier badge not visible

**Check**:
1. Verify Sidebar receives `profile` prop
2. Check `profile?.subscription_status` value
3. Ensure user is not dev account (dev badge not shown)
4. Check CSS classes for yellow/green badges

---

## Automated Test Suite (Future)

Consider adding these automated tests:

```typescript
describe('Monetization Strategy', () => {
  test('Free user below threshold pays 1x rate', async () => {
    const user = createTestUser({
      subscription_status: 'free',
      monthly_usage: 50
    });
    const cost = await performAction(user, 'chat_message');
    expect(cost).toBe(1); // Base cost, no multiplier
  });

  test('Free user above threshold pays 3x rate', async () => {
    const user = createTestUser({
      subscription_status: 'free',
      monthly_usage: 150
    });
    const cost = await performAction(user, 'chat_message');
    expect(cost).toBe(3); // 1 * 3x multiplier
  });

  test('Lite subscriber always pays 1x rate', async () => {
    const user = createTestUser({
      subscription_status: 'lite',
      monthly_usage: 500
    });
    const cost = await performAction(user, 'chat_message');
    expect(cost).toBe(1); // No multiplier
  });

  test('Vibe Code is locked for free users', async () => {
    const user = createTestUser({ subscription_status: 'free' });
    const canAccess = await checkFeatureAccess(user, 'vibeCoding');
    expect(canAccess).toBe(false);
  });

  test('Vibe Code is unlocked for Lite users', async () => {
    const user = createTestUser({ subscription_status: 'lite' });
    const canAccess = await checkFeatureAccess(user, 'vibeCoding');
    expect(canAccess).toBe(true);
  });
});
```

---

## Deployment Checklist

Before pushing to production:

- [ ] Test all scenarios above in staging environment
- [ ] Verify environment variables are set correctly
- [ ] Test with real Stripe integration (if applicable)
- [ ] Monitor error rates during rollout
- [ ] Set up alerts for 402 errors (insufficient credits)
- [ ] Prepare support team with FAQ responses
- [ ] Have rollback plan ready if issues arise

---

## Success Indicators

After deployment, monitor:

1. **Technical**:
   - 402 error rate (should be <5% of requests)
   - Database query performance on profile table
   - Realtime subscription stability

2. **Business**:
   - % of free users crossing 100-credit threshold
   - Conversion rate from free to Lite after crossing
   - Average time from threshold to conversion

3. **User Experience**:
   - Support tickets related to pricing confusion
   - User feedback on rate tier messaging
   - Churn rate of free users vs subscribers

---

**Last Updated**: January 9, 2026
**Implementation Status**: ✅ Ready for Testing
