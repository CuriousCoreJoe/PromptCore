/**
 * PromptCore Pricing Configuration
 *
 * This file defines the entire monetization strategy including:
 * - Subscription tiers with feature flags
 * - Credit costs per action
 * - The "Efficiency Logic" (Usage Tax) thresholds
 */

export interface SubscriptionTier {
  name: 'free' | 'lite' | 'pro';
  displayName: string;
  price: number; // in cents (e.g., 899 = $8.99)
  monthlyCredits: number;
  overageMultiplier: number; // The "Standard Rate" vs "Preferred Rate"
  usageThreshold: number | null; // Credits used before multiplier kicks in (null = no threshold)
  features: {
    promptFactory: boolean;
    vibeCoding: boolean;
    appBuilder: boolean;
    talkToSource: boolean;
    workspaceSave: boolean;
    mediaGen: boolean;
    prioritySupport: boolean;
  };
  // Trial limits for free users on premium features
  trialLimits?: {
    vibeCodeUses: number; // Number of Vibe Code uses per month for free users
    talkToSourceUses: number; // Number of Talk to Source uses per month for free users
    mediaGenUses: number; // Number of Media Gen uses per month for free users
  };
}

export interface CreditCost {
  chatMessage: number;
  promptFactoryBatch: number; // Per batch of 5 prompts
  appBuildPrototype: number;
  mediaGenPrompt: number;
  talkToSourceQuery: number;
}

// Subscription Tiers Definition
export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    name: 'free',
    displayName: 'Standard',
    price: 0,
    monthlyCredits: 50,
    overageMultiplier: 3.0, // THE "USAGE TAX" - After 100 credits, actions cost 3x
    usageThreshold: 100, // Multiplier kicks in after 100 credits used this month
    features: {
      promptFactory: true, // THE HOOK - Unrestricted access to burn credits fast
      vibeCoding: true, // TRIAL - Limited uses, higher cost
      appBuilder: true, // TRIAL - Limited uses, higher cost
      talkToSource: true, // TRIAL - Limited uses, higher cost
      workspaceSave: false, // LOCKED - Can't save work
      mediaGen: true, // TRIAL - Limited uses, higher cost
      prioritySupport: false,
    },
    trialLimits: {
      vibeCodeUses: 5, // Free users can use Vibe Code 5 times per month
      talkToSourceUses: 10, // Free users can use Talk to Source 10 times per month
      mediaGenUses: 10, // Free users can use Media Gen 10 times per month
    },
  },
  lite: {
    name: 'lite',
    displayName: 'Creator (Preferred)',
    price: 899, // $8.99
    monthlyCredits: 1000,
    overageMultiplier: 1.0, // NO PENALTY - "Preferred Rate"
    usageThreshold: null, // No threshold
    features: {
      promptFactory: true,
      vibeCoding: true, // UNLOCKED - Unlimited
      appBuilder: true, // UNLOCKED - Unlimited
      talkToSource: true, // UNLOCKED - Unlimited
      workspaceSave: true, // UNLOCKED
      mediaGen: true, // UNLOCKED - Unlimited
      prioritySupport: false,
    },
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    price: 1499, // $14.99
    monthlyCredits: 2500,
    overageMultiplier: 1.0, // NO PENALTY
    usageThreshold: null,
    features: {
      promptFactory: true,
      vibeCoding: true,
      appBuilder: true,
      talkToSource: true,
      workspaceSave: true,
      mediaGen: true,
      prioritySupport: true,
    },
  },
};

// Base Credit Costs (before multiplier)
export const CREDIT_COSTS: CreditCost = {
  chatMessage: 1,
  promptFactoryBatch: 5, // 5 credits per batch (generates ~5 prompts)
  appBuildPrototype: 30, // Building a full app prototype
  mediaGenPrompt: 5, // Generating a media prompt
  talkToSourceQuery: 2, // Analyzing source content
};

// Credit Pack Options
export interface CreditPack {
  amount: number;
  price: number; // in cents
  label: string;
  perCredit: string;
  highlighted?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    amount: 500,
    price: 500, // $5.00
    label: 'Starter Pack',
    perCredit: '1¢ / credit',
  },
  {
    amount: 1500,
    price: 1200, // $12.00
    label: 'Creator Pack',
    perCredit: '0.8¢ / credit',
    highlighted: true,
  },
  {
    amount: 5000,
    price: 3500, // $35.00
    label: 'Agency Pack',
    perCredit: '0.7¢ / credit',
  },
];

/**
 * Calculate the cost of an action based on user's subscription tier and usage
 * This is the core "Efficiency Logic" that implements the "Usage Tax"
 */
export function calculateActionCost(
  baseCost: number,
  subscriptionStatus: 'free' | 'lite' | 'pro',
  monthlyUsage: number
): number {
  const tier = SUBSCRIPTION_TIERS[subscriptionStatus];

  // Subscribers never pay the penalty
  if (subscriptionStatus !== 'free') {
    return baseCost;
  }

  // Free users: Check if they've crossed the threshold
  if (tier.usageThreshold !== null && monthlyUsage > tier.usageThreshold) {
    return baseCost * tier.overageMultiplier; // 3x cost
  }

  return baseCost;
}

/**
 * Get user-friendly rate tier messaging
 */
export function getRateTierMessage(
  subscriptionStatus: 'free' | 'lite' | 'pro',
  monthlyUsage: number
): string {
  const tier = SUBSCRIPTION_TIERS[subscriptionStatus];

  if (subscriptionStatus === 'free') {
    if (tier.usageThreshold !== null && monthlyUsage > tier.usageThreshold) {
      return `You are on the Standard Rate (${tier.overageMultiplier}x). Subscribe to Lite to unlock Preferred Rates (1x) and save credits.`;
    }
    return `Standard Rate active. After ${tier.usageThreshold} credits this month, costs increase ${tier.overageMultiplier}x. Upgrade to Lite for consistent pricing.`;
  }

  return `Preferred Rate active. You pay standard prices with no usage penalties.`;
}

/**
 * Check if a user has access to a specific feature
 */
export function hasFeatureAccess(
  feature: keyof SubscriptionTier['features'],
  subscriptionStatus: 'free' | 'lite' | 'pro'
): boolean {
  const tier = SUBSCRIPTION_TIERS[subscriptionStatus];
  return tier.features[feature];
}

/**
 * Calculate credit cost for a specific mode
 * Free users pay higher costs for premium modes
 */
export function calculateModeCost(
  mode: string,
  subscriptionStatus: 'free' | 'lite' | 'pro'
): number {
  const tier = SUBSCRIPTION_TIERS[subscriptionStatus];
  
  // Subscribers pay standard rates
  if (subscriptionStatus !== 'free') {
    switch (mode) {
      case 'Vibe Code':
        return CREDIT_COSTS.appBuildPrototype;
      case 'Talk to Source':
        return CREDIT_COSTS.talkToSourceQuery;
      case 'Media Gen':
        return CREDIT_COSTS.mediaGenPrompt;
      default:
        return CREDIT_COSTS.chatMessage;
    }
  }
  
  // Free users pay higher rates for premium modes (2x-3x)
  switch (mode) {
    case 'Vibe Code':
      return CREDIT_COSTS.appBuildPrototype * 3; // 90 credits per use
    case 'Talk to Source':
      return CREDIT_COSTS.talkToSourceQuery * 2; // 4 credits per use
    case 'Media Gen':
      return CREDIT_COSTS.mediaGenPrompt * 2; // 10 credits per use
    default:
      return CREDIT_COSTS.chatMessage;
  }
}

/**
 * Check if a free user has exceeded their trial limit for a premium mode
 */
export function hasExceededTrialLimit(
  mode: string,
  subscriptionStatus: 'free' | 'lite' | 'pro',
  monthlyUsage: { vibeCode?: number; talkToSource?: number; mediaGen?: number }
): { exceeded: boolean; remaining: number; limit: number } {
  // Subscribers have no limits
  if (subscriptionStatus !== 'free') {
    return { exceeded: false, remaining: Infinity, limit: Infinity };
  }
  
  const tier = SUBSCRIPTION_TIERS.free;
  const limits = tier.trialLimits!;
  
  switch (mode) {
    case 'Vibe Code':
      const vibeCodeUsed = monthlyUsage.vibeCode || 0;
      return {
        exceeded: vibeCodeUsed >= limits.vibeCodeUses,
        remaining: Math.max(0, limits.vibeCodeUses - vibeCodeUsed),
        limit: limits.vibeCodeUses
      };
    case 'Talk to Source':
      const talkToSourceUsed = monthlyUsage.talkToSource || 0;
      return {
        exceeded: talkToSourceUsed >= limits.talkToSourceUses,
        remaining: Math.max(0, limits.talkToSourceUses - talkToSourceUsed),
        limit: limits.talkToSourceUses
      };
    case 'Media Gen':
      const mediaGenUsed = monthlyUsage.mediaGen || 0;
      return {
        exceeded: mediaGenUsed >= limits.mediaGenUses,
        remaining: Math.max(0, limits.mediaGenUses - mediaGenUsed),
        limit: limits.mediaGenUses
      };
    default:
      return { exceeded: false, remaining: Infinity, limit: Infinity };
  }
}

/**
 * Get trial limit message for a mode
 */
export function getTrialLimitMessage(
  mode: string,
  subscriptionStatus: 'free' | 'lite' | 'pro',
  monthlyUsage: { vibeCode?: number; talkToSource?: number; mediaGen?: number }
): string | null {
  if (subscriptionStatus !== 'free') return null;
  
  const check = hasExceededTrialLimit(mode, subscriptionStatus, monthlyUsage);
  
  if (check.exceeded) {
    return `You've used all ${check.limit} free uses of ${mode} this month. Upgrade to Lite for unlimited access.`;
  }
  
  return `${check.remaining} free ${mode} uses remaining this month (${check.limit} total).`;
}
