import { Inject, Injectable } from "@nestjs/common";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "./auth.types";

export const PASSWORD_RESET_DELIVERY = Symbol("PASSWORD_RESET_DELIVERY");
export interface PasswordResetDelivery {
  send(to: string, resetUrl: string, expiresAt: Date): Promise<boolean>;
}

@Injectable()
export class ConfiguredPasswordResetDelivery implements PasswordResetDelivery {
  private readonly captured: Array<{ to: string; resetUrl: string; expiresAt: string }> = [];

  constructor(@Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment) {}

  async send(to: string, resetUrl: string, expiresAt: Date): Promise<boolean> {
    if (this.environment.localPasswordResetSinkEnabled) {
      this.captured.push({ to, resetUrl, expiresAt: expiresAt.toISOString() });
      return true;
    }
    const { passwordResetEmailEndpoint: endpoint, passwordResetEmailApiKey: apiKey, passwordResetEmailFrom: from } = this.environment;
    if (!endpoint || !apiKey || !from) return false;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          subject: "Reset your JurisMind password",
          text: `Use this link to reset your password. It expires at ${expiresAt.toISOString()}: ${resetUrl}`,
        }),
        signal: AbortSignal.timeout(5_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  drainCaptured(): Array<{ to: string; resetUrl: string; expiresAt: string }> {
    return this.captured.splice(0);
  }
}
