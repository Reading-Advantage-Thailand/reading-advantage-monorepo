import bcrypt from 'bcryptjs';

export class PasswordUtils {
  /**
   * Hash a plain text password
   * @param password - Plain text password
   * @returns Hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  /**
   * Compare a plain text password with a hashed password
   * @param password - Plain text password
   * @param hashedPassword - Hashed password from database
   * @returns Boolean indicating if passwords match
   */
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Check if a password is already hashed (bcrypt format)
   * @param password - Password string to check
   * @returns Boolean indicating if password is hashed
   */
  static isHashed(password: string): boolean {
    return password.startsWith('$2');
  }
}
