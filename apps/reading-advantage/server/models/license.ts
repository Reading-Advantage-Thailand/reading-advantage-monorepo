import { DocumentData } from "firebase/firestore";
import { LicenseExpirationDate, LicenseSubScriptionLevel } from "./enum";
import { randomUUID } from "crypto";

export interface License extends DocumentData {
  id: string; // school id
  key: string;
  schoolName: string; // Updated field name
  maxUsers: number; // Updated field name
  usedLicenses: number; // Updated field name
  licenseType: string; // Updated field name
  ownerUserId: string; // Updated field name
  expiresAt: string; // Updated field name
  createdAt: string; // Updated field name
  updatedAt: string; // Updated field name
}

// records (sub collection) of license
export interface LicenseRecord extends DocumentData {
  id: string; // user id
  license_key: string;
  activated_at: string;
}

export const createLicenseModel = ({
  totalLicense,
  subscriptionLevel,
  // default 1 days
  expirationDate,
  userId,
  adminId,
  schoolName,
}: {
  totalLicense: number;
  subscriptionLevel: LicenseSubScriptionLevel;
  expirationDate?: string;
  userId: string;
  adminId: string;
  schoolName: string;
}): Omit<License, "id"> => {
  const date = new Date().toISOString();
  const now = new Date();
  const newDate = new Date(
    now.getTime() + Number(expirationDate) * 24 * 60 * 60 * 1000
  );

  return {
    key: randomUUID(),
    total_licenses: totalLicense,
    used_licenses: 0,
    subscription_level: subscriptionLevel,
    expiration_date: new Date(newDate).toISOString(),
    user_id: userId,
    updated_at: date,
    created_at: date,
    admin_id: adminId,
    school_name: schoolName,
  };
};
