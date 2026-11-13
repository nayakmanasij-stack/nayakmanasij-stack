import { writeFileSync } from "node:fs";

const owner = "nayakmanasij-stack";
const response = await fetch("https://github.com/users/" + owner + "/contributions");
if (!response.ok) throw new Error("GitHub returned HTTP " + response.status);
const html = await response.text();
const days = [...html.matchAll(/<td\b[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="([0-4])"[^>]*>/g)]
  .map(([, date, level]) => ({ date, level: Number(level) }))
  .sort((a, b) => a.date.localeCompare(b.date));
const total = html.match(/([\d,]+)\s+contributions?\s+in\s+the\s+last\s+year/i)?.[1];
if (days.length < 350 || !total) throw new Error("GitHub did not return the full contribution calendar");

const palette = ["#252840", "#1f574d", "#308578", "#50bd9f", "#85f8ca"];
const last = days.at(-1).date;
const dates = new Map(days.map(({ date, level }) => [date, level]));
const end = new Date(last + "T00:00:00Z");
const start = new Date(end);
start.setUTCDate(end.getUTCDate() - end.getUTCDay() - 52 * 7);
const cells = [];
const labels = [];
for (let index = 0; index < 371; index++) {
  const date = new Date(start.getTime() + index * 86_400_000);
  const day = date.toISOString().slice(0, 10);
  const column = Math.floor(index / 7);
  const x = 29 + column * 17;
  if (index % 7 === 0 && (date.getUTCDate() <= 7 || index === 0) && column < 51) {
    labels.push('<text x="' + x + '" y="61">' + date.toLocaleString("en", {month:"short", timeZone:"UTC"}) + '</text>');
  }
  if (!dates.has(day)) continue;
  const y = 71 + (index % 7) * 15;
  cells.push('<rect x="' + x + '" y="' + y + '" width="13" height="11" rx="2" fill="' + palette[dates.get(day)] + '"/>');
}
const scale = palette.map((color, index) => '<rect x="' + (790 + index * 17) + '" y="194" width="13" height="11" rx="2" fill="' + color + '"/>').join("");
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="225" viewBox="0 0 960 225" role="img" aria-labelledby="title">' +
  '<title id="title">' + total + ' GitHub contributions in the past year, through ' + last + '</title>' +
  '<rect x="1" y="1" width="958" height="223" rx="14" fill="#13162a" stroke="#393d60"/>' +
  '<text x="28" y="36" fill="#f6f4ff" font-family="system-ui,sans-serif" font-size="19" font-weight="650">' + total + ' contributions in the past year</text>' +
  '<g fill="#bfc3eb" font-family="system-ui,sans-serif" font-size="12">' + labels.join("") +
  '<text x="28" y="204">Source: GitHub · ' + last + '</text><text x="755" y="204">Less</text><text x="879" y="204">More</text></g>' +
  cells.join("") + scale + '</svg>\n';
writeFileSync(new URL("./assets/activity.svg", import.meta.url), svg);
