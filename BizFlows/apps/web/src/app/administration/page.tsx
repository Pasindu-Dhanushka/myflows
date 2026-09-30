"use client";

import { MoreHorizontal, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
type User = { id: string; firstName: string; lastName: string; email: string; isActive: boolean; createdAt: string; roles: string[] };
type Audit = { id: string; action: string; previousRoles: string[]; newRoles: string[]; createdAt: string; actor: Pick<User, "firstName" | "lastName" | "email">; target: Pick<User, "firstName" | "lastName" | "email"> };
const roleNames = ["OWNER", "ADMIN", "USER"];

export default function AdministrationPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [tab, setTab] = useState<"users" | "audit">("users");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const me = await fetch(`${API_URL}/auth/me`, { credentials: "include", cache: "no-store" });
    if (!me.ok) return router.replace("/signin");
    const mePayload = await me.json() as { user: { roles: string[] } };
    if (!mePayload.user.roles.some((role) => role === "ADMIN" || role === "OWNER")) return router.replace("/login-success");
    const [usersResponse, auditResponse] = await Promise.all([
      fetch(`${API_URL}/administration/users`, { credentials: "include", cache: "no-store" }),
      fetch(`${API_URL}/administration/audit-log`, { credentials: "include", cache: "no-store" }),
    ]);
    if (!usersResponse.ok || !auditResponse.ok) throw new Error("Unable to load administration data.");
    setUsers(await usersResponse.json() as User[]);
    setAudits(await auditResponse.json() as Audit[]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load administration data.")).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(term));
  }, [search, users]);

  function edit(user: User) { setEditing(user); setSelected(user.roles); setMessage(""); setError(""); }
  function toggleRole(role: string) { setSelected((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]); }

  async function save() {
    if (!editing || !selected.length) return setError("Select at least one role.");
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`${API_URL}/administration/users/${editing.id}/roles`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roles: selected }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(payload.message) ? payload.message.join(" ") : payload.message ?? "Unable to update roles.");
      setEditing(null); setMessage("Roles updated successfully."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update roles."); }
    finally { setSaving(false); }
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-header"><div><h1>Administration</h1><p>Manage users, roles and monitor platform activity</p></div><Link href="/login-success">Back to dashboard</Link></header>
        <nav className="admin-tabs" aria-label="Administration sections">
          <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Users</button>
          <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>Audit Log</button>
        </nav>
        {message && <p className="admin-feedback success" role="status">{message}</p>}
        {error && <p className="admin-feedback error" role="alert">{error}</p>}
        <section className="admin-card">
          {loading ? <p className="route-status">Loading...</p> : tab === "users" ? <>
            <div className="admin-toolbar"><div className="admin-search"><Search size={17}/><input aria-label="Search users" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." /></div><span>{filteredUsers.length} users</span></div>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Roles</th><th>Status</th><th>Joined</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
              {filteredUsers.map((user) => <tr key={user.id}><td><div className="user-cell"><span className="user-avatar">{user.firstName[0]}{user.lastName[0]}</span><div><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></div></div></td><td><div className="badge-list">{user.roles.map((role) => <span className="role-badge" key={role}>{role[0] + role.slice(1).toLowerCase()}</span>)}</div></td><td><span className={`status-badge ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Active" : "Inactive"}</span></td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td><button className="icon-button" aria-label={`Edit roles for ${user.firstName}`} title="Edit Role" onClick={() => edit(user)}><MoreHorizontal size={20}/></button></td></tr>)}
            </tbody></table></div>
          </> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Actor</th><th>Target</th><th>Action</th><th>Change</th><th>Date</th></tr></thead><tbody>{audits.map((audit) => <tr key={audit.id}><td>{audit.actor.firstName} {audit.actor.lastName}<small>{audit.actor.email}</small></td><td>{audit.target.firstName} {audit.target.lastName}<small>{audit.target.email}</small></td><td>{audit.action}</td><td>{audit.previousRoles.join(", ")} → {audit.newRoles.join(", ")}</td><td>{new Date(audit.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>}
        </section>
      </div>
      {editing && <div className="modal-backdrop" role="presentation"><section className="role-modal" role="dialog" aria-modal="true" aria-labelledby="role-modal-title"><header><div><h2 id="role-modal-title">Edit Role</h2><p>{editing.firstName} {editing.lastName} · {editing.email}</p></div><button className="icon-button" aria-label="Close" onClick={() => setEditing(null)}><X size={20}/></button></header><div className="role-options">{roleNames.map((role) => <label key={role}><input type="checkbox" checked={selected.includes(role)} onChange={() => toggleRole(role)}/><span><strong>{role[0] + role.slice(1).toLowerCase()}</strong><small>{role === "ADMIN" ? "Manage users and roles" : role === "OWNER" ? "Full platform access" : "Build and run workflows"}</small></span></label>)}</div><footer><button className="secondary-admin-button" onClick={() => setEditing(null)}>Cancel</button><button className="primary-admin-button" disabled={saving || !selected.length} onClick={save}>{saving ? "Saving..." : "Save changes"}</button></footer></section></div>}
    </main>
  );
}
