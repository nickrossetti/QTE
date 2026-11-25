"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { JOB_TYPES } from "@/domain/job-form";
import { createQuote, loadQuotes, type SavedQuote } from "@/lib/quotes-store";

export function QuoteList() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<SavedQuote[] | null>(null);

  useEffect(() => {
    setQuotes(loadQuotes());
  }, []);

  function start() {
    const quote = createQuote();
    router.push(`/quote/${quote.id}`);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="flex-1">Quotes</h1>
        <button type="button" className="q-btn q-btn-go q-btn-big" onClick={start} data-testid="new-quote">
          + New quote
        </button>
      </div>
      <div className="card overflow-x-auto">
        {!quotes ? (
          <p className="muted">Loading quotes saved on this device…</p>
        ) : quotes.length === 0 ? (
          <p>No quotes yet. Start with + New quote.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Quote</th>
                <th>Customer</th>
                <th>Job / machine</th>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const type = JOB_TYPES.find((item) => item.value === quote.draft.productionOrder.orderType);
                return (
                  <tr key={quote.id} className="click" onClick={() => router.push(`/quote/${quote.id}`)}>
                    <td>
                      <Link href={`/quote/${quote.id}`} className="font-bold text-navy no-underline">
                        {quote.number}
                      </Link>
                      {quote.id === "sample-quote" && <span className="tag sample ml-2">Sample</span>}
                    </td>
                    <td>{quote.draft.quote.customerName || quote.draft.quote.customerId || ""}</td>
                    <td>{quote.draft.quote.description || ""}</td>
                    <td>{type?.title || ""}</td>
                    <td className="whitespace-nowrap">{quote.updatedAt.slice(0, 10)}</td>
                    <td>
                      <span className={`tag ${quote.status}`}>{quote.status === "sent" ? "Sent" : "Draft"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="muted">Quotes stay on this device until you send them. Click a row to open it.</p>
    </div>
  );
}
