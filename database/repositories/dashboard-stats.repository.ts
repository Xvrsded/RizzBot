import { GiftOrderSessionModel } from "../models/gift-order-session.model";
import { RobuxOrderSessionModel } from "../models/robux-order-session.model";
import { LoginOrderSessionModel } from "../models/login-order-session.model";
import { LimitedOrderSessionModel } from "../models/limited-order-session.model";

function getStartOfTodayWib(): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return new Date(`${year}-${month}-${day}T00:00:00+07:00`);
}

export const dashboardStatsRepository = {
  async countOrdersTodayByGuild(guildId: string): Promise<number> {
    const since = getStartOfTodayWib();
    const filter = { guildId, createdAt: { $gte: since } };

    const [gift, robux, login, limited] = await Promise.all([
      GiftOrderSessionModel.countDocuments(filter).exec(),
      RobuxOrderSessionModel.countDocuments(filter).exec(),
      LoginOrderSessionModel.countDocuments(filter).exec(),
      LimitedOrderSessionModel.countDocuments(filter).exec(),
    ]);

    return gift + robux + login + limited;
  },
};

export function formatDashboardTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    hour12: false,
  }).format(date);
}
