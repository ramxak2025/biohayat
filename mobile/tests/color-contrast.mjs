import assert from "node:assert/strict";

function rgba(value) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return [...value.slice(1).match(/../g).map(channel => parseInt(channel, 16)), 1];
  const match = /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d*\.?\d+))?\s*\)$/.exec(value);
  assert.ok(match, `Unsupported contrast color: ${value}`);
  const color = [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])];
  assert.ok(color.slice(0, 3).every(channel => channel >= 0 && channel <= 255) && color[3] >= 0 && color[3] <= 1);
  return color;
}
const over = (foreground, background) => foreground.slice(0, 3).map((channel, i) => channel * foreground[3] + background[i] * (1 - foreground[3]));
const luminance = rgb => rgb.map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, i) => sum + channel * [.2126, .7152, .0722][i], 0);

export function contrast(foreground, background, canvas = "#FFFFFF") {
  const base = rgba(canvas);
  assert.equal(base[3], 1, "Contrast needs an opaque underlying canvas");
  const renderedBackground = over(rgba(background), base);
  const renderedText = over(rgba(foreground), renderedBackground);
  const [light, dark] = [luminance(renderedText), luminance(renderedBackground)].sort((a, b) => b - a);
  return (light + .05) / (dark + .05);
}
