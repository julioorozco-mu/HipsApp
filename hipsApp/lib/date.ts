const shortDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatIsoDate(value: string) {
  return shortDateFormatter.format(new Date(`${value}T00:00:00Z`));
}
