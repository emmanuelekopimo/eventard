/** Format a Date as the UTC basic format Google Calendar expects: 20261015T140000Z. */
export function toGoogleDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export type CalendarEvent = {
  title: string;
  description: string;
  venue: string;
  startsAt: Date;
  endsAt: Date;
};

/** Build an "Add to Google Calendar" link. No API key needed: Google prefills its own form. */
export function googleCalendarUrl(e: CalendarEvent, detailsUrl?: string): string {
  const details = detailsUrl ? `${e.description}\n\nDetails: ${detailsUrl}` : e.description;
  const params = [
    ["action", "TEMPLATE"],
    ["text", e.title],
    ["dates", `${toGoogleDate(e.startsAt)}/${toGoogleDate(e.endsAt)}`],
    ["details", details],
    ["location", e.venue],
  ];
  const qs = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return `https://calendar.google.com/calendar/render?${qs}`;
}
