/** Fixture-only public authentication port available to product apps. */
export interface PublicCompanyAuthPort {
  requireUser(): Promise<{ accountId: string }>;
}

/** Fixture-only public authentication port instance. */
export declare const publicCompanyAuth: PublicCompanyAuthPort;
