"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/actions/users";
import { cn } from "@/lib/utils";

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
const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function UserForm({
  roles,
  action,
  submitLabel,
  user,
  includePassword = false,
}: UserFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Name*</Label>
          <Input defaultValue={user?.name} id="name" name="name" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email*</Label>
          <Input
            defaultValue={user?.email}
            id="email"
            name="email"
            required
            type="email"
          />
        </div>
      </div>

      {includePassword ? (
        <div className="grid gap-2">
          <Label htmlFor="password">Temporary password*</Label>
          <Input
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />
          <p className="text-sm text-muted-foreground">
            Minimum 8 characters. The user can reset it later.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="department">Department</Label>
          <Input
            defaultValue={user?.department ?? ""}
            id="department"
            name="department"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="region">Region</Label>
          <Input defaultValue={user?.region ?? ""} id="region" name="region" />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="status">Status*</Label>
        <select
          className={selectClass}
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

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Roles*</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {roles.map((role) => (
            <label
              className="flex items-center gap-2 text-sm"
              key={role.id}
            >
              <input
                className="h-4 w-4 rounded border-input"
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

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className={cn("flex flex-wrap gap-3")}>
        <Button disabled={pending} type="submit">
          {pending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
