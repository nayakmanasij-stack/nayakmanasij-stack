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

const last = days.at(-1).date;
const end = new Date(last + "T00:00:00Z");
const start = new Date(end);
start.setUTCDate(end.getUTCDate() - end.getUTCDay() - 52 * 7);
const activeDays = days.filter(({ level }) => level > 0).length;
const columnColors = ["#263a39", "#3d8568", "#58af82", "#7cdca0", "#aeffc5"];

function polygon(points, fill) {
  return '<polygon points="' + points.map(point => point.join(",")).join(" ") + '" fill="' + fill + '"/>';
}

function tile(x, y, level) {
  const top = y - level * 15;
  const face = [[x, top], [x + 13, top - 2], [x + 21, top + 7], [x + 8, top + 9]];
  const topFace = polygon(face, columnColors[level]);
  if (level === 0) return topFace;
  return [
    polygon([face[3], face[2], [x + 21, y + 7], [x + 8, y + 9]], "#2d694f"),
    polygon([face[1], face[2], [x + 21, y + 7], [x + 13, y - 2]], "#1e473c"),
    topFace,
  ].join("");
}

const tiles = days.map(({ date, level }) => {
  const index = Math.round((Date.parse(date + "T00:00:00Z") - start.getTime()) / 86_400_000);
  const week = Math.floor(index / 7);
  const weekday = index % 7;
  return { x: 35 + week * 15 + weekday * 9, y: 218 - week * 2 + weekday * 12, level };
}).sort((a, b) => a.y - b.y);

const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="356" viewBox="0 0 960 356" role="img" aria-labelledby="title">',
  '  <title id="title">' + total + ' GitHub contributions across ' + activeDays + ' active days in the past year</title>',
  '  <rect x="1" y="1" width="958" height="354" rx="16" fill="#10191d" stroke="#445e56" stroke-width="2"/>',
  '  <g font-family="system-ui,sans-serif">',
  '    <text x="28" y="45" fill="#f1fff8" font-size="30" font-weight="700">' + total + ' contributions</text>',
  '    <text x="28" y="71" fill="#b7cec4" font-size="18">Past year · ' + activeDays + ' active days</text>',
  '  </g>',
  '  <g stroke="#172624" stroke-width=".55">',
  ...tiles.map(({ x, y, level }) => "    " + tile(x, y, level)),
  '  </g>',
  '  <path d="M28 308h904" stroke="#445e56"/>',
  '  <g fill="#b7cec4" font-family="system-ui,sans-serif" font-size="16">',
  '    <text x="28" y="334">GitHub · Updated ' + last + '</text>',
  '    <text x="703" y="334">Less</text><text x="891" y="334">More</text>',
  '  </g>',
  ...columnColors.map((color, index) => '  <rect x="' + (748 + index * 27) + '" y="321" width="21" height="14" rx="3" fill="' + color + '"/>'),
  '</svg>',
].join("\n");

writeFileSync(new URL("./assets/contribution-city.svg", import.meta.url), svg + "\n");
