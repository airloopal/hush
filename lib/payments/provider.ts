import "server-only";
import { isDemoMode } from "@/lib/auth/mode";
import { rampexAdapter } from "@/lib/payments/providers/rampex-adapter";
import { demoPaymentAdapter } from "@/lib/payments/providers/demo-adapter";
import type { PaymentProviderAdapter } from "@/lib/payments/provider-adapter";

export function getPaymentProviderAdapter(): PaymentProviderAdapter {
  return isDemoMode() ? demoPaymentAdapter : rampexAdapter;
}
