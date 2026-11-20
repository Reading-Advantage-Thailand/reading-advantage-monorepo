"use client";

import { useState } from "react";

/**
 * The props of the password field.
 */
export interface PasswordFieldProps {
  /** The label of the field. */
  label: string;
  /** The label of the toggle when the password is masked. */
  showLabel: string;
  /** The label of the toggle when the password is shown. */
  hideLabel: string;
}

/**
 * Renders the password field and its show and hide toggle.
 *
 * The field keeps its name, id, and autocomplete value, so a form submission without script still
 * carries the password. The toggle is presentation only.
 * @param props The labels of the field and the toggle.
 * @returns The labelled field and the toggle.
 */
export function PasswordField({ label, showLabel, hideLabel }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div data-entry-password>
      <div>
        <label data-entry-label htmlFor="password">
          {label}
        </label>
        <input
          data-entry-field
          id="password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          required
        />
      </div>
      <button
        type="button"
        data-password-toggle
        aria-controls="password"
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? hideLabel : showLabel}
      </button>
    </div>
  );
}
