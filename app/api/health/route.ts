import { NextResponse } from 'next/server';

export async function GET() {
  const hasStripeSecret = Boolean(process.env.STRIPE_SECRET_KEY);
  const hasStripePublishable = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  return NextResponse.json({
    ok: true,
    stripe: {
      secretKeyPresent: hasStripeSecret,
      publishableKeyPresent: hasStripePublishable,
    },
  });
}
