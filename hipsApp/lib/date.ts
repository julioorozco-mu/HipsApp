const shortDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

export function formatIsoDate(value: string) {
  return shortDateFormatter.format(new Date(`${value}T00:00:00Z`));
}

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}
