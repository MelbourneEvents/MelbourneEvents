"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { ALLOWED_EVENT_TYPES, EVENT_TYPE_LABELS, EventType } from "@/lib/eventTypes";

export interface OrganisationOption {
  id: string;
  name: string;
}

export function FilterBar({ organisations }: { organisations: OrganisationOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <form
      className="mb-8 flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        updateParam("search", search);
      }}
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500" htmlFor="search">
          Search
        </label>
        <input
          id="search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Title, tag, organisation…"
          className="w-56 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500" htmlFor="type">
          Type
        </label>
        <select
          id="type"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          value={searchParams.get("type") ?? ""}
          onChange={(e) => updateParam("type", e.target.value)}
        >
          <option value="">All types</option>
          {ALLOWED_EVENT_TYPES.map((type: EventType) => (
            <option key={type} value={type}>
              {EVENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500" htmlFor="organisationId">
          Organisation
        </label>
        <select
          id="organisationId"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          value={searchParams.get("organisationId") ?? ""}
          onChange={(e) => updateParam("organisationId", e.target.value)}
        >
          <option value="">All organisations</option>
          {organisations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500" htmlFor="when">
          When
        </label>
        <select
          id="when"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          value={searchParams.get("when") ?? "upcoming"}
          onChange={(e) => updateParam("when", e.target.value)}
        >
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="all">All</option>
        </select>
      </div>

      <button
        type="submit"
        className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        Search
      </button>
    </form>
  );
}
