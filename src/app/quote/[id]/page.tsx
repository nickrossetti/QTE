"use client";

import { use } from "react";
import { QuoteEditor } from "@/components/QuoteEditor";
import { Shell } from "@/components/Shell";

export default function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Shell>
      <QuoteEditor id={id} />
    </Shell>
  );
}
