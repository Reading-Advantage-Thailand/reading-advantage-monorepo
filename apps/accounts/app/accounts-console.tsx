"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import type { Employee } from "@reading-advantage/backend";

const APPLICATIONS = [
  { key: "marketing", label: "Marketing", href: "https://marketing.reading-advantage.com", roles: ["MEMBER", "ADMIN"] },
  { key: "sales", label: "Sales Advantage", href: "https://sales.reading-advantage.com", roles: ["SALES_REP", "SALES_ADMIN"] },
  { key: "codecamp", label: "Codecamp", href: "https://codecamp.reading-advantage.com", roles: ["STUDENT", "INTERN", "TEACHER", "ADMIN"] },
] as const;

function operationKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function jsonRequest(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "The operation could not be completed.");
  return payload;
}

/** A product-originated Accounts employee-provisioning preset. */
export interface ProvisioningHandoff {
  /** Exact application receiving the initial role. */
  readonly applicationKey: "sales";
  /** Exact least-privilege role selected by the originating product. */
  readonly roleKey: "SALES_REP";
}

/** Refined employee directory and independent application-role administration surface. */
export function AccountsConsole({ employee, provisioning }: Readonly<{
  employee: Employee;
  provisioning?: ProvisioningHandoff;
}>) {
  const isAdmin = employee.companyRoles.includes("COMPANY_ADMIN");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState(employee.id);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const payload = await jsonRequest("/api/admin/employees", "GET");
      setEmployees(payload.employees);
      setError("");
    } catch (caught) { setError((caught as Error).message); }
  }, [isAdmin]);

  useEffect(() => { void refresh(); }, [refresh]);
  const selected = useMemo(
    () => employees.find((item) => item.id === selectedId) ?? employees[0],
    [employees, selectedId],
  );

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await jsonRequest("/api/admin/employees", "POST", {
        username: form.get("username"),
        displayName: form.get("displayName"),
        initialPassword: form.get("initialPassword"),
        companyRoles: ["EMPLOYEE"],
        appRoles: provisioning
          ? { [provisioning.applicationKey]: [provisioning.roleKey] }
          : {},
        idempotencyKey: operationKey("employee-create"),
      });
      formElement.reset();
      setNotice("Employee created. The initial credential was not retained in this view.");
      await refresh();
    } catch (caught) { setError((caught as Error).message); }
  }

  async function setRoles(applicationKey: string, roleKeys: string[]) {
    if (!selected) return;
    try {
      await jsonRequest(`/api/admin/employees/${selected.id}/roles`, "PUT", {
        applicationKey, roleKeys, idempotencyKey: operationKey("role-change"),
      });
      setNotice(`${applicationKey} roles updated without changing other applications.`);
      await refresh();
    } catch (caught) { setError((caught as Error).message); }
  }

  async function setCompanyAdmin(enabled: boolean) {
    if (!selected) return;
    if (!enabled && !window.confirm(
      `Remove company administrator authority from ${selected.displayName}?`,
    )) return;
    try {
      await jsonRequest(`/api/admin/employees/${selected.id}/company-roles`, "PUT", {
        roleKeys: enabled ? ["EMPLOYEE", "COMPANY_ADMIN"] : ["EMPLOYEE"],
        idempotencyKey: operationKey("company-role-change"),
      });
      setNotice("Company authority updated without changing product access.");
      await refresh();
    } catch (caught) { setError((caught as Error).message); }
  }

  async function setStatus(status: "ACTIVE" | "SUSPENDED") {
    if (!selected) return;
    if (status === "SUSPENDED" && !window.confirm(
      `Suspend ${selected.displayName} and revoke every active session?`,
    )) return;
    try {
      await jsonRequest(`/api/admin/employees/${selected.id}/status`, "PATCH", {
        status, idempotencyKey: operationKey("status-change"),
      });
      setNotice(status === "SUSPENDED" ? "Employee suspended and active sessions revoked." : "Employee restored.");
      await refresh();
    } catch (caught) { setError((caught as Error).message); }
  }

  async function resetCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const value = new FormData(formElement).get("newPassword");
    if (!window.confirm(
      `Replace ${selected.displayName}'s credential and revoke every active session?`,
    )) return;
    try {
      await jsonRequest(`/api/admin/employees/${selected.id}/credential`, "PUT", {
        newPassword: value, idempotencyKey: operationKey("credential-reset"),
      });
      formElement.reset();
      setNotice("Credential replaced and all sessions revoked. The password is no longer displayed.");
    } catch (caught) { setError((caught as Error).message); }
  }

  async function revokeSessions() {
    if (!selected) return;
    if (!window.confirm(
      `Revoke every Accounts and application session for ${selected.displayName}?`,
    )) return;
    try {
      await jsonRequest(`/api/admin/employees/${selected.id}/sessions`, "DELETE", {
        idempotencyKey: operationKey("session-revoke"),
      });
      setNotice("All Accounts and application sessions were revoked.");
    } catch (caught) { setError((caught as Error).message); }
  }

  async function logout() {
    await jsonRequest("/api/session/logout", "POST");
    window.location.assign("/");
  }

  return (
    <section className="console-stage">
      <header className="console-hero">
        <div>
          <p className="eyebrow">IDENTITY CONTROL / {isAdmin ? "ADMIN" : "EMPLOYEE"}</p>
          <h1>Good day, <em>{employee.displayName}.</em></h1>
          <p>Company authority and application authority remain separate by design.</p>
        </div>
        <button className="quiet-action" onClick={logout}>SIGN OUT ↗</button>
      </header>

      {!isAdmin ? (
        <div className="access-ledger">
          <h2>Your application ledger</h2>
          {APPLICATIONS.map((app) => (
            <div className="ledger-row" key={app.key}>
              <a href={app.href}>{app.label} ↗</a>
              <b>{employee.appRoles[app.key]?.join(" · ") || "NO ACCESS"}</b>
            </div>
          ))}
        </div>
      ) : (
        <div className="console-grid">
          <aside className="directory-panel">
            <div className="panel-heading"><span>01</span><h2>Directory</h2><b>{employees.length}</b></div>
            <div className="employee-list" aria-label="Employees">
              {employees.map((item) => (
                <button key={item.id} aria-pressed={selected?.id === item.id}
                  aria-label={`Select ${item.displayName}, ${item.status.toLowerCase()}`}
                  className={selected?.id === item.id ? "employee-item selected" : "employee-item"}
                  onClick={() => setSelectedId(item.id)}>
                  <i className={item.status === "ACTIVE" ? "status-dot" : "status-dot suspended"} />
                  <span><b>{item.displayName}</b><small>@{item.username}</small></span>
                </button>
              ))}
            </div>
            <form className="create-form" onSubmit={createEmployee}>
              <h3>Add employee</h3>
              {provisioning && (
                <p className="provisioning-note" role="status">
                  Sales handoff · new identity receives SALES_REP only
                </p>
              )}
              <input name="displayName" placeholder="Display name" aria-label="Display name" required />
              <input name="username" placeholder="username" aria-label="Username" required />
              <input name="initialPassword" type="password" placeholder="Initial password" aria-label="Initial password" minLength={12} required />
              <button className="primary-action">CREATE IDENTITY <b>+</b></button>
            </form>
          </aside>

          <article className="detail-panel">
            {selected && <>
              <div className="identity-heading">
                <div className="monogram">{selected.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</div>
                <div><p className="eyebrow">EMPLOYEE RECORD</p><h2>{selected.displayName}</h2><span>@{selected.username}</span></div>
                <span className={`status-pill ${selected.status.toLowerCase()}`}>{selected.status}</span>
              </div>
              <div className="authority-strip">
                <span>Company authority</span>
                <b>{selected.companyRoles.join(" · ")}</b>
                <small>Does not grant product access</small>
              </div>
              <label className="company-admin-toggle">
                <input
                  type="checkbox"
                  checked={selected.companyRoles.includes("COMPANY_ADMIN")}
                  onChange={(event) => void setCompanyAdmin(event.target.checked)}
                />
                <span>Company administrator</span>
                <small>Manages identities only; product roles remain unchanged.</small>
              </label>
              <section className="role-matrix">
                <div className="section-title"><span>02</span><h3>Application assignments</h3></div>
                {APPLICATIONS.map((app) => (
                  <fieldset key={app.key}>
                    <legend><a href={app.href}>{app.label} ↗</a></legend>
                    {app.roles.map((role) => {
                      const checked = selected.appRoles[app.key]?.includes(role) ?? false;
                      return <label key={role} className="role-check">
                        <input type="checkbox" checked={checked} onChange={() => {
                          const existing = selected.appRoles[app.key] ?? [];
                          void setRoles(app.key, checked ? existing.filter((item) => item !== role) : [...existing, role]);
                        }} />
                        <span>{role}</span>
                      </label>;
                    })}
                  </fieldset>
                ))}
              </section>
              <section className="security-actions">
                <div className="section-title"><span>03</span><h3>Identity controls</h3></div>
                <div className="action-row">
                  <button className="quiet-action" onClick={() => void setStatus(selected.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>
                    {selected.status === "ACTIVE" ? "SUSPEND IDENTITY" : "RESTORE IDENTITY"}
                  </button>
                  <button className="quiet-action" onClick={() => void revokeSessions()}>REVOKE ALL SESSIONS</button>
                </div>
                <form className="reset-form" onSubmit={resetCredential}>
                  <input name="newPassword" type="password" minLength={12} placeholder="New password" aria-label="New password" required />
                  <button className="quiet-action">RESET CREDENTIAL</button>
                </form>
              </section>
            </>}
          </article>
        </div>
      )}
      {(notice || error) && <div className={error ? "toast error" : "toast"}
        role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"}>
        {error || notice}<button onClick={() => { setNotice(""); setError(""); }} aria-label="Dismiss message">×</button>
      </div>}
    </section>
  );
}
