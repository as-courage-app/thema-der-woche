import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

export async function POST(req: Request) {
  const { plan } = await req.json();

  const priceId =
    plan === 'A'
      ? process.env.STRIPE_PRICE_ID_A
      : plan === 'B'
        ? process.env.STRIPE_PRICE_ID_B
        : plan === 'C'
          ? process.env.STRIPE_PRICE_ID_C
          : null;

  if (!priceId) {
    return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/account?checkout=cancel`,
  });

  return NextResponse.json({ url: session.url });
}
