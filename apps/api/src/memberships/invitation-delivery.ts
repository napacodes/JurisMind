/** Delivery boundary for invitations. Configure a provider before claiming email delivery. */
export interface InvitationDelivery {
  deliver(input: { email: string; token: string; expiresAt: Date }): Promise<"delivered" | "unavailable">;
}

export const INVITATION_DELIVERY = Symbol("INVITATION_DELIVERY");

/** No provider is configured in this repository; intentionally never logs or returns a token. */
export class UnconfiguredInvitationDelivery implements InvitationDelivery {
  async deliver(): Promise<"unavailable"> {
    return "unavailable";
  }
}
