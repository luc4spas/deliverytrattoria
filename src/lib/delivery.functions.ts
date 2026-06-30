import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

type ComputeFeeResult = {
  ok: true;
  distance_km: number;
  motoboy_cost: number;
  customer_fee: number;
} | {
  ok: false;
  error: string;
};

/**
 * Calcula valor da "ida" conforme tabela progressiva.
 */
function computeOneWayCost(km: number): { cost: number; perKmRate: number } {
  if (km <= 3) return { cost: 8.99, perKmRate: 2.0 };
  if (km <= 5) return { cost: 8.99 + (km - 3) * 2.0, perKmRate: 2.0 };
  if (km <= 8) return { cost: 8.99 + 2 * 2.0 + (km - 5) * 3.0, perKmRate: 3.0 };
  return { cost: 8.99 + 2 * 2.0 + 3 * 3.0 + (km - 8) * 2.5, perKmRate: 2.5 };
}

function mapCustomerFee(motoboyCost: number): number {
  if (motoboyCost <= 8) return 10;
  if (motoboyCost <= 12) return 15;
  if (motoboyCost <= 16) return 20;
  return 25;
}

export const calculateDeliveryFee = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        origin: z.string().min(5).max(300),
        destination: z.string().min(5).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ComputeFeeResult> => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE_API_KEY) return { ok: false, error: "LOVABLE_API_KEY ausente" };
    if (!GOOGLE_MAPS_API_KEY) return { ok: false, error: "GOOGLE_MAPS_API_KEY ausente" };

    try {
      const res = await fetch(
        `${GATEWAY_URL}/routes/directions/v2:computeRoutes`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
            "Content-Type": "application/json",
            "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
          },
          body: JSON.stringify({
            origin: { address: data.origin },
            destination: { address: data.destination },
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_UNAWARE",
            regionCode: "BR",
          }),
        },
      );

      const json: any = await res.json();
      if (!res.ok) {
        console.error("Routes API error", res.status, json);
        return { ok: false, error: `Rota não encontrada (${res.status})` };
      }

      const meters = json?.routes?.[0]?.distanceMeters;
      if (typeof meters !== "number") {
        return { ok: false, error: "Distância indisponível para esse endereço" };
      }

      const km = meters / 1000;
      const { cost: oneWay, perKmRate } = computeOneWayCost(km);
      const totalKm = km * 2;
      const returnFee = totalKm * perKmRate * 0.3;
      const motoboyCost = oneWay + returnFee;
      const customerFee = mapCustomerFee(motoboyCost);

      return {
        ok: true,
        distance_km: Math.round(km * 100) / 100,
        motoboy_cost: Math.round(motoboyCost * 100) / 100,
        customer_fee: customerFee,
      };
    } catch (err: any) {
      console.error("calculateDeliveryFee failed", err);
      return { ok: false, error: err?.message ?? "Falha no cálculo" };
    }
  });
