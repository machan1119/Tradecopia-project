"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Period = "today" | "this_month" | "last_month" | "all";

type VpsRecord = {
  id: string | null;
  email: string | null;
  ip_address: string | null;
  create_date: string | null;
  delete_date: string | null;
};

type Summary = {
  active_count: number;
  created_count: number;
  deleted_count: number;
};

type ApiResponse = {
  summary: Summary;
  records: VpsRecord[];
};

type PeriodOption = {
  value: Period;
  label: string;
  description: string;
};

const PERIOD_OPTIONS: PeriodOption[] = [
  {
    value: "today",
    label: "Today",
    description: "Records from midnight (UTC-5) until now",
  },
  {
    value: "this_month",
    label: "This Month",
    description: "Activity for the current calendar month (UTC-5)",
  },
  {
    value: "last_month",
    label: "Last Month",
    description: "Activity for the previous calendar month (UTC-5)",
  },
  {
    value: "all",
    label: "All",
    description: "All records across all time",
  },
];

function isApiResponse(value: unknown): value is ApiResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "records" in value && "summary" in value;
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function Dashboard() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("today");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  const loadData = useCallback(
    async (activePeriod: Period, activeSearch: string) => {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ period: activePeriod });
      if (activeSearch) {
        params.set("search", activeSearch);
      }

      try {
        const response = await fetch(`/api/vps-records?${params.toString()}`, {
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as unknown;

        if (!response.ok || !isApiResponse(payload)) {
          if (response.status === 401) {
            router.replace("/login");
            return;
          }
          const errorMessage =
            (payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof (payload as { error?: string }).error === "string"
              ? (payload as { error?: string }).error
              : null) ?? "Failed to load records";
          throw new Error(errorMessage);
        }

        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadData(period, searchTerm);
  }, [loadData, period, searchTerm]);

  const summary = useMemo(() => data?.summary, [data]);
  const records = useMemo(() => data?.records ?? [], [data]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSearchTerm(searchInput.trim());
    },
    [searchInput]
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setSearchTerm("");
  }, []);

  const handleRetry = useCallback(() => {
    void loadData(period, searchTerm);
  }, [loadData, period, searchTerm]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // Ignore errors
    } finally {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Tradecopia Dashboard
            </h1>
            <p className="text-sm text-slate-400">
              Monitor VPS provisioning and deletion activity across the
              platform.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="self-start rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-slate-500"
          >
            Log out
          </button>
        </header>

        <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg sm:grid-cols-6">
          <div className="sm:col-span-3">
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
              onSubmit={handleSubmit}
            >
              <label
                className="text-sm font-medium text-slate-300"
                htmlFor="search"
              >
                Search by email or IP
              </label>
              <div className="flex flex-1 gap-2">
                <input
                  id="search"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="example@email.com or 192.168.x.x"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <button
                  type="submit"
                  className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-indigo-400"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-slate-500"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>

          <div className="sm:col-span-3">
            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((option) => {
                const isActive = period === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPeriod(option.value)}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                      isActive
                        ? "bg-indigo-500 text-white shadow hover:bg-indigo-400 focus-visible:ring-indigo-400"
                        : "border border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:text-white focus-visible:ring-slate-500"
                    }`}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
            <h2 className="text-sm font-medium text-slate-400">Active VPS</h2>
            <p className="mt-2 text-3xl font-semibold text-white">
              {summary ? summary.active_count.toLocaleString() : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Records with an IP address and no deletion date.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
            <h2 className="text-sm font-medium text-slate-400">Created</h2>
            <p className="mt-2 text-3xl font-semibold text-white">
              {summary ? summary.created_count.toLocaleString() : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              VPS provisioned within the selected period.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
            <h2 className="text-sm font-medium text-slate-400">Deleted</h2>
            <p className="mt-2 text-3xl font-semibold text-white">
              {summary ? summary.deleted_count.toLocaleString() : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              VPS deletions within the selected period.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold text-white">VPS Records</h2>
              <p className="text-xs text-slate-500">
                Showing up to 200 latest records. Adjust the search or period to
                refine results.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-slate-500"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center px-4 py-16 text-sm text-slate-400">
              Loading records…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-indigo-400"
              >
                Try again
              </button>
            </div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center px-4 py-16 text-sm text-slate-400">
              No records match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      IP Address
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Created
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Deleted
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {records.map((record) => (
                    <tr
                      key={record.id ?? `${record.email}-${record.create_date}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-200">
                        {record.email ?? "Unknown"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-200">
                        {record.ip_address ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-200">
                        {formatDate(record.create_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-200">
                        {formatDate(record.delete_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
