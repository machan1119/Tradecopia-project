import { cookies } from "next/headers";
import { Filter, Sort } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, isAuthorizedToken } from "@/lib/auth";
import { getVpsCollection } from "@/lib/mongodb";

type Period = "today" | "this_month" | "last_month" | "all";
type PeriodRange = {
  start?: Date;
  end?: Date;
};

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;
const TZ_OFFSET_MINUTES = -5 * 60;
const TZ_OFFSET_MS = TZ_OFFSET_MINUTES * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function parsePeriod(raw: string | null): Period {
  if (!raw) {
    return "today";
  }

  const value = raw.toLowerCase();
  if (
    value === "today" ||
    value === "this_month" ||
    value === "last_month" ||
    value === "all"
  ) {
    return value;
  }

  throw new Error("Invalid period. Use today, this_month, last_month, or all.");
}

function toLocal(date: Date): Date {
  return new Date(date.getTime() + TZ_OFFSET_MS);
}

function toUtc(date: Date): Date {
  return new Date(date.getTime() - TZ_OFFSET_MS);
}

function startOfLocalDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function startOfLocalMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getPeriodRange(period: Period, now: Date): PeriodRange {
  const localNow = toLocal(now);

  switch (period) {
    case "today": {
      const localStart = startOfLocalDay(localNow);
      const localEnd = new Date(localStart.getTime() + ONE_DAY_MS);
      return { start: toUtc(localStart), end: toUtc(localEnd) };
    }
    case "this_month": {
      const localStart = startOfLocalMonth(localNow);
      const localEnd = startOfLocalMonth(
        new Date(
          Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth() + 1, 1)
        )
      );
      return { start: toUtc(localStart), end: toUtc(localEnd) };
    }
    case "last_month": {
      const localThisMonthStart = startOfLocalMonth(localNow);
      const localLastMonthStart = startOfLocalMonth(
        new Date(
          Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth() - 1, 1)
        )
      );
      return {
        start: toUtc(localLastMonthStart),
        end: toUtc(localThisMonthStart),
      };
    }
    case "all":
    default:
      return {};
  }
}

function buildDateRangeFilter(
  field: "create_date" | "delete_date",
  start?: Date,
  end?: Date
): Filter<VpsRecord> | null {
  const range: Record<string, Date> = {};
  if (start) {
    range.$gte = start;
  }
  if (end) {
    range.$lt = end;
  }

  if (Object.keys(range).length === 0) {
    return null;
  }

  return { [field]: range } as Filter<VpsRecord>;
}

type VpsRecord = {
  id?: string;
  email?: string;
  ip_address?: string | null;
  plan_id?: number | null;
  create_date?: Date | null;
  delete_date?: Date | null;
};

type SerializedRecord = {
  id: string | null;
  email: string | null;
  ip_address: string | null;
  plan_id?: number | null;
  create_date: string | null;
  delete_date: string | null;
};

function serializeRecord(record: VpsRecord): SerializedRecord {
  return {
    id: record.id ?? null,
    email: record.email ?? null,
    ip_address: record.ip_address ?? null,
    plan_id: record.plan_id ?? null,
    create_date: record.create_date ? record.create_date.toISOString() : null,
    delete_date: record.delete_date ? record.delete_date.toISOString() : null,
  };
}

function parseLimit(raw: string | null): number {
  if (!raw) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("limit must be a positive number");
  }

  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  const sessionCookie = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!isAuthorizedToken(sessionCookie)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const collection = await getVpsCollection();
  const now = new Date();

  try {
    const { searchParams } = new URL(request.url);
    const period = parsePeriod(searchParams.get("period"));
    const search = searchParams.get("search")?.trim() ?? "";
    const limit = parseLimit(searchParams.get("limit"));

    const { start: rangeStart, end: rangeEnd } = getPeriodRange(period, now);

    const filters: Filter<VpsRecord>[] = [];

    if (search) {
      const regex = { $regex: search, $options: "i" };
      filters.push({
        $or: [{ email: regex }, { ip_address: regex }],
      });
    }

    const periodClauses = [
      buildDateRangeFilter("create_date", rangeStart, rangeEnd),
      buildDateRangeFilter("delete_date", rangeStart, rangeEnd),
    ].filter(Boolean) as Filter<VpsRecord>[];

    if (periodClauses.length > 0) {
      filters.push({ $or: periodClauses });
    }

    const query: Filter<VpsRecord> =
      filters.length === 0
        ? {}
        : filters.length === 1
        ? filters[0]
        : { $and: filters };

    const sort: Sort = {
      create_date: -1,
      delete_date: -1,
    };

    const recordsCursor = collection
      .find<VpsRecord>(query)
      .sort(sort)
      .limit(limit);
    const records = (await recordsCursor.toArray()).map(serializeRecord);

    const searchFilter = search
      ? ({
          $or: [
            { email: { $regex: search, $options: "i" } },
            { ip_address: { $regex: search, $options: "i" } },
          ],
        } as Filter<VpsRecord>)
      : null;

    const activeFilterParts: Filter<VpsRecord>[] = [
      { ip_address: { $exists: true, $nin: [null, ""] } },
      { $or: [{ delete_date: null }, { delete_date: { $exists: false } }] },
    ];
    const activeRange = buildDateRangeFilter(
      "create_date",
      rangeStart,
      rangeEnd
    );
    if (activeRange) {
      activeFilterParts.push(activeRange);
    }
    if (searchFilter) {
      activeFilterParts.push(searchFilter);
    }
    const activeFilter: Filter<VpsRecord> =
      activeFilterParts.length === 1
        ? activeFilterParts[0]
        : { $and: activeFilterParts };

    const createdFilterParts: Filter<VpsRecord>[] = [
      { create_date: { $ne: null } },
    ];
    const createdRange = buildDateRangeFilter(
      "create_date",
      rangeStart,
      rangeEnd
    );
    if (createdRange) {
      createdFilterParts.push(createdRange);
    }
    if (searchFilter) {
      createdFilterParts.push(searchFilter);
    }
    const createdFilter: Filter<VpsRecord> =
      createdFilterParts.length === 1
        ? createdFilterParts[0]
        : { $and: createdFilterParts };

    const deletedFilterParts: Filter<VpsRecord>[] = [
      { delete_date: { $ne: null } },
    ];
    const deletedRange = buildDateRangeFilter(
      "delete_date",
      rangeStart,
      rangeEnd
    );
    if (deletedRange) {
      deletedFilterParts.push(deletedRange);
    }
    if (searchFilter) {
      deletedFilterParts.push(searchFilter);
    }
    const deletedFilter: Filter<VpsRecord> =
      deletedFilterParts.length === 1
        ? deletedFilterParts[0]
        : { $and: deletedFilterParts };

    const [activeCount, createdCount, deletedCount] = await Promise.all([
      collection.countDocuments(activeFilter),
      collection.countDocuments(createdFilter),
      collection.countDocuments(deletedFilter),
    ]);

    return NextResponse.json({
      period,
      period_start: rangeStart ? rangeStart.toISOString() : null,
      period_end: rangeEnd ? rangeEnd.toISOString() : null,
      summary: {
        active_count: activeCount,
        created_count: createdCount,
        deleted_count: deletedCount,
      },
      records,
    });
  } catch (error) {
    console.error("Failed to fetch VPS records:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 400 }
    );
  }
}
