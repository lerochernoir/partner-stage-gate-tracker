"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const PREVIEW_LENGTH = 420;

export function InitialRationalePreview({ value }: { value: string | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!value?.trim()) {
    return <p className="mt-2 text-sm text-muted-foreground">No rationale entered yet.</p>;
  }

  const shouldTruncate = value.length > PREVIEW_LENGTH;
  const displayValue =
    shouldTruncate && !expanded ? `${value.slice(0, PREVIEW_LENGTH).trimEnd()}...` : value;

  return (
    <div className="mt-2 grid gap-2">
      <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
        {displayValue}
      </p>
      {shouldTruncate ? (
        <div>
          <Button
            onClick={() => setExpanded((current) => !current)}
            size="sm"
            type="button"
            variant="outline"
          >
            {expanded ? "Show less" : "Show more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
