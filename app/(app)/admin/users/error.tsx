"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function UsersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route:/admin/users] Error boundary caught route error.", error);
  }, [error]);

  return (
    <div className="grid gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-sm">
      <div>
        <h1 className="text-2xl font-semibold text-destructive">Route error</h1>
        <p className="mt-2 text-muted-foreground">Route: /admin/users</p>
      </div>

      <div className="grid gap-2">
        <div>
          <div className="font-medium">error.message</div>
          <pre className="mt-1 overflow-x-auto rounded-md bg-background p-3 text-xs">
            {error.message}
          </pre>
        </div>

        <div>
          <div className="font-medium">error.digest</div>
          <pre className="mt-1 overflow-x-auto rounded-md bg-background p-3 text-xs">
            {error.digest ?? "No digest provided"}
          </pre>
        </div>
      </div>

      <div>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
