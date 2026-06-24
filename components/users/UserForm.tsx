"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/users";

type Role = {
  id: string;
  name: string;
  code: string;
};

type UserFormProps = {
  roles: Role[];
  action: (previousState: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  user?: {
    name: string;
    email: string;
    department: string | null;
    region: string | null;
    status: string;
    roleIds: string[];
  };
  includePassword?: boolean;
};

const initialState: FormState = {};

export function UserForm({
  roles,
  action,
  submitLabel,
  user,
  includePassword = false,
}: UserFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form">
      <div className="grid two">
        <div className="field">
          <label className="label" htmlFor="name">
            Name*
          </label>
          <input
            className="input"
            defaultValue={user?.name}
            id="name"
            name="name"
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="email">
            Email*
          </label>
          <input
            className="input"
            defaultValue={user?.email}
            id="email"
            name="email"
            required
            type="email"
          />
        </div>
      </div>

      {includePassword ? (
        <div className="field">
          <label className="label" htmlFor="password">
            Temporary password*
          </label>
          <input
            className="input"
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />
          <p className="help">Minimum 8 characters. User can reset later.</p>
        </div>
      ) : null}

      <div className="grid two">
        <div className="field">
          <label className="label" htmlFor="department">
            Department
          </label>
          <input
            className="input"
            defaultValue={user?.department ?? ""}
            id="department"
            name="department"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="region">
            Region
          </label>
          <input
            className="input"
            defaultValue={user?.region ?? ""}
            id="region"
            name="region"
          />
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="status">
          Status*
        </label>
        <select
          className="select"
          defaultValue={user?.status ?? "active"}
          id="status"
          name="status"
          required
        >
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <fieldset className="fieldset">
        <legend className="label">Roles*</legend>
        <div className="checkbox-grid">
          {roles.map((role) => (
            <label key={role.id} className="checkbox-label">
              <input
                defaultChecked={user?.roleIds.includes(role.id)}
                name="roleIds"
                type="checkbox"
                value={role.id}
              />
              <span>{role.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error ? <p className="error">{state.error}</p> : null}
      <div className="button-row">
        <button className="button primary" disabled={pending} type="submit">
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
