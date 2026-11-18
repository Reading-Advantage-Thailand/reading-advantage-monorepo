"use client";

/**
 * Client commission calculator for the Tutor Advantage page
 * (track www_tutor_calculator_20261117, spec 5.3, AC-9).
 * Every figure comes from the pure module in `@/lib/tutor-commission`; this file
 * owns the layout and the input state only.
 */

import { useState } from "react";
import type { ChangeEvent } from "react";
import {
  CLASS_PRICE_DEFAULT,
  NETWORK_PRESETS,
  calculateNetwork,
  commissionRate,
  explainVariant,
  resizeLegs,
} from "@/lib/tutor-commission";
import { SectionHeader } from "./section-header";

/** Localized copy for the calculator, passed from the server page (spec 5.3). */
export type TutorCommissionCalculatorProps = {
  copy: {
    eyebrow: string;
    heading: string;
    description: string;
    volumeNote: string;
    rateNote: string;
    payoutNote: string;
    disclaimer: string;
    inputs: {
      price: string;
      priceNote: string;
      ownStudents: string;
      legCount: string;
      legStudents: string;
      addLeg: string;
      removeLeg: string;
    };
    results: {
      ownGV: string;
      networkGV: string;
      rate: string;
      gross: string;
      legCommissions: string;
      tax: string;
      net: string;
    };
    explain: { ownOnly: string; withLegs: string; zero: string; needsOwnStudents: string };
    graph: {
      title: string;
      caption: string;
      ownBar: string;
      legBar: string;
      grossBar: string;
      legCommissionBar: string;
      netBar: string;
      axisBaht: string;
      rateTitle: string;
      rateAxis: string;
      ratePoint: string;
    };
    presets: readonly { name: string; setup: string; result: string }[];
  };
};

/** Highest volume on the decorative rate curve, in baht (spec D-11). */
const CURVE_MAX_VOLUME = 500_000;

/** Height of the rate curve plot area, in viewBox units. */
const CURVE_HEIGHT = 40;

/** The rate the curve approaches, 0.5 / 0.7 (spec section 3). */
const CURVE_MAX_RATE = 0.5 / 0.7;

/** Number of segments the rate curve is sampled with. */
const CURVE_STEPS = 100;

/**
 * Formats baht with ASCII digits and comma grouping (spec D-3).
 * A whole amount drops the decimals; every other amount keeps exactly two.
 * @param value The amount in baht.
 * @returns The formatted amount, for example "5,520" or "4,506.32".
 */
function formatMoney(value: number): string {
  const fixed = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  const [whole, fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/**
 * Formats a commission rate with one decimal and drops a trailing ".0" (spec D-3).
 * @param rate The rate from 0 to 1.
 * @returns The formatted rate, for example "46%" or "52.7%".
 */
function formatRate(rate: number): string {
  const percent = Number((rate * 100).toFixed(1));
  return `${percent}%`;
}

/**
 * Reads a text field as a number of 0 or more.
 * @param text The field value.
 * @returns The parsed number, or 0 for an empty, negative, or invalid value.
 */
function readNumber(text: string): number {
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** The rate curve of spec D-11, as SVG polyline points over 0 to 500,000 baht. */
const RATE_CURVE_POINTS = Array.from({ length: CURVE_STEPS + 1 }, (_unused, index) => {
  const volume = (CURVE_MAX_VOLUME * index) / CURVE_STEPS;
  const x = (index / CURVE_STEPS) * 100;
  const y = CURVE_HEIGHT * (1 - commissionRate(volume) / CURVE_MAX_RATE);
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}).join(" ");

/**
 * Renders the commission calculator: the preset row, the input cards with one
 * student row per leg, the payout graph, the rate curve, and the live result panel.
 * @param props The localized copy of spec 5.3.
 * @returns The calculator content.
 */
export function TutorCommissionCalculator({ copy }: TutorCommissionCalculatorProps) {
  const [priceText, setPriceText] = useState(String(CLASS_PRICE_DEFAULT));
  const [ownText, setOwnText] = useState("0");
  const [legCountText, setLegCountText] = useState("0");
  const [legTexts, setLegTexts] = useState<readonly string[]>([]);
  const [presetIndex, setPresetIndex] = useState<number | null>(null);

  const result = calculateNetwork({
    price: readNumber(priceText),
    personalStudents: readNumber(ownText),
    studentsPerLeg: legTexts.map(readNumber),
  });

  const variant = explainVariant(result);
  const selectedPreset = presetIndex === null ? null : copy.presets[presetIndex];

  const markerVolume = Math.min(result.networkVolume, CURVE_MAX_VOLUME);
  const markerX = (markerVolume / CURVE_MAX_VOLUME) * 100;
  const markerY = CURVE_HEIGHT * (1 - commissionRate(markerVolume) / CURVE_MAX_RATE);

  /** Returns a row's share of the network volume, for the bar width of spec D-9 and D-20. */
  const shareOfNetwork = (amount: number) => {
    if (result.networkVolume <= 0) return 0;
    return Math.min(100, Math.max(0, (amount / result.networkVolume) * 100));
  };

  const onPriceChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPriceText(event.target.value);
    setPresetIndex(null);
  };

  const onOwnChange = (event: ChangeEvent<HTMLInputElement>) => {
    setOwnText(event.target.value);
    setPresetIndex(null);
  };

  const onLegCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setLegCountText(text);
    // An empty field keeps the leg rows and their typed students (AC-23).
    if (text.trim() !== "") {
      setLegTexts(resizeLegs(legTexts.map(readNumber), readNumber(text)).map(String));
    }
    setPresetIndex(null);
  };

  const onLegStudentsChange = (index: number, text: string) => {
    setLegTexts(legTexts.map((value, position) => (position === index ? text : value)));
    setPresetIndex(null);
  };

  /** Sets the leg count and resizes the student rows to match (spec 5.3 item 4). */
  const setLegCount = (count: number) => {
    setLegCountText(String(count));
    setLegTexts(resizeLegs(legTexts.map(readNumber), count).map(String));
    setPresetIndex(null);
  };

  /** Reads the leg-count field, or the row count while the field is empty (AC-23). */
  const readLegCount = () =>
    legCountText.trim() === "" ? legTexts.length : readNumber(legCountText);

  /** Adds one leg, at the default student count (spec 5.3 item 4). */
  const addLeg = () => {
    setLegCount(readLegCount() + 1);
  };

  /** Removes the last leg and keeps the rest (spec 5.3 item 4). */
  const removeLeg = () => {
    setLegCount(Math.max(0, readLegCount() - 1));
  };

  /** Applies a preset input; the price resets to 3,000 baht (spec D-5). */
  const applyPreset = (index: number) => {
    const preset = NETWORK_PRESETS[index];
    setPriceText(String(preset.price));
    setOwnText(String(preset.personalStudents));
    setLegCountText(String(preset.studentsPerLeg.length));
    setLegTexts(preset.studentsPerLeg.map(String));
    setPresetIndex(index);
  };

  const rows = [
    { label: copy.results.ownGV, value: formatMoney(result.ownVolume) },
    { label: copy.results.networkGV, value: formatMoney(result.networkVolume) },
    { label: copy.results.rate, value: formatRate(result.rate) },
    { label: copy.results.gross, value: formatMoney(result.gross) },
    { label: copy.results.legCommissions, value: formatMoney(result.legPayouts) },
    { label: copy.results.tax, value: formatMoney(result.withholdingTax) },
  ];

  const fieldClass =
    "mt-2 min-h-11 w-full rounded-xl border border-site-border bg-white px-3 text-base tabular-nums text-site-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2";

  return (
    <div className="space-y-10">
      <SectionHeader eyebrow={copy.eyebrow} title={copy.heading} description={copy.description} />

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 space-y-6 lg:col-span-7">
          <div>
            <div className="flex flex-wrap gap-2">
              {copy.presets.map((preset, index) => {
                const active = presetIndex === index;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => applyPreset(index)}
                    className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                      active
                        ? "border-emerald-900 bg-emerald-900 text-white"
                        : "border-emerald-200 bg-white text-emerald-950 hover:border-emerald-600"
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
            {selectedPreset === null ? null : (
              <p className="mt-3 text-sm leading-relaxed text-site-body">{selectedPreset.setup}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
              <label htmlFor="tutor-price" className="block text-sm font-semibold text-site-navy">
                {copy.inputs.price}
              </label>
              <input
                id="tutor-price"
                type="number"
                min={0}
                step={100}
                inputMode="numeric"
                value={priceText}
                onChange={onPriceChange}
                className={fieldClass}
              />
              <p className="mt-2 text-xs leading-relaxed text-site-body">{copy.inputs.priceNote}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
                <label htmlFor="tutor-own-students" className="block text-sm font-semibold text-site-navy">
                  {copy.inputs.ownStudents}
                </label>
                <input
                  id="tutor-own-students"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={ownText}
                  onChange={onOwnChange}
                  className={fieldClass}
                />
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
                <label htmlFor="tutor-leg-count" className="block text-sm font-semibold text-site-navy">
                  {copy.inputs.legCount}
                </label>
                <input
                  id="tutor-leg-count"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={legCountText}
                  onChange={onLegCountChange}
                  className={fieldClass}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addLeg}
                    className="inline-flex min-h-11 items-center rounded-full border border-emerald-200 bg-white px-4 text-sm font-medium text-emerald-950 transition-colors hover:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 motion-reduce:transition-none"
                  >
                    {copy.inputs.addLeg}
                  </button>
                  <button
                    type="button"
                    onClick={removeLeg}
                    className="inline-flex min-h-11 items-center rounded-full border border-emerald-200 bg-white px-4 text-sm font-medium text-emerald-950 transition-colors hover:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 motion-reduce:transition-none"
                  >
                    {copy.inputs.removeLeg}
                  </button>
                </div>
              </div>
            </div>

            {legTexts.length === 0 ? null : (
              <div className="space-y-3 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
                {legTexts.map((text, index) => (
                  <div key={`tutor-leg-${index}`} className="grid items-center gap-2 sm:grid-cols-2">
                    <label
                      htmlFor={`tutor-leg-${index}-students`}
                      className="text-sm leading-relaxed text-site-body"
                    >
                      {index + 1}. {copy.inputs.legStudents}
                    </label>
                    <input
                      id={`tutor-leg-${index}-students`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={text}
                      onChange={(event) => onLegStudentsChange(index, event.target.value)}
                      className="min-h-11 w-full rounded-xl border border-site-border bg-white px-3 text-base tabular-nums text-site-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-3 text-base font-semibold text-site-navy">{copy.graph.rateTitle}</h3>
              <svg
                viewBox="0 0 100 40"
                className="h-auto w-full"
                aria-hidden="true"
                focusable="false"
              >
                <line
                  x1="0"
                  y1="40"
                  x2="100"
                  y2="40"
                  className="stroke-emerald-200"
                  strokeWidth={0.5}
                />
                <polyline
                  points={RATE_CURVE_POINTS}
                  fill="none"
                  className="stroke-emerald-600"
                  strokeWidth={1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle cx={markerX} cy={markerY} r={1.5} className="fill-emerald-900" />
              </svg>
              <p className="mt-3 text-sm leading-relaxed text-site-body">
                <span className="font-medium text-site-navy">{copy.graph.ratePoint}</span>
                {" · "}
                <span className="font-semibold tabular-nums text-emerald-900">
                  {formatRate(result.rate)}
                </span>
              </p>
              <p className="mt-1 text-xs tracking-eyebrow text-site-body">{copy.graph.rateAxis}</p>
            </div>

            <div className="space-y-4 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h3 className="text-base font-semibold text-site-navy">{copy.graph.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-site-body">{copy.graph.caption}</p>
              </div>

              <p className="text-xs tracking-eyebrow text-site-body">{copy.graph.axisBaht}</p>

              {result.legs.map((leg) => (
                <div key={`graph-leg-${leg.leg}`}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium text-site-navy">
                      {copy.graph.legBar.replace("{n}", String(leg.leg))}
                    </span>
                    <span className="tabular-nums text-site-body">
                      {formatMoney(leg.volume)}
                    </span>
                    <span className="ml-auto font-semibold tabular-nums text-emerald-900">
                      {formatMoney(leg.payout)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="bar-width h-full rounded-full bg-emerald-600"
                      style={{ "--bar-width": `${shareOfNetwork(leg.volume)}%` }}
                    />
                  </div>
                </div>
              ))}

              <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium text-site-navy">{copy.graph.ownBar}</span>
                  <span className="ml-auto font-semibold tabular-nums text-emerald-900">
                    {formatMoney(result.ownVolume)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="bar-width h-full rounded-full bg-emerald-900"
                    style={{ "--bar-width": `${shareOfNetwork(result.ownVolume)}%` }}
                  />
                </div>
              </div>

              <dl className="space-y-2 border-t border-site-border pt-4 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-site-body">{copy.graph.grossBar}</dt>
                  <dd className="font-medium tabular-nums text-site-navy">
                    {formatMoney(result.gross)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-site-body">{copy.graph.legCommissionBar}</dt>
                  <dd className="font-medium tabular-nums text-site-navy">
                    {formatMoney(result.legPayouts)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-site-body">{copy.graph.netBar}</dt>
                  <dd className="font-medium tabular-nums text-site-navy">
                    {formatMoney(result.net)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-5">
          <div
            aria-live="polite"
            className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-emerald-800">
              {copy.results.net}
            </p>
            <p className="mt-2 text-4xl font-semibold tabular-nums text-site-navy sm:text-5xl">
              {formatMoney(result.net)}
            </p>

            <dl className="mt-6 space-y-2 border-t border-site-border pt-4 text-sm">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-site-body">{row.label}</dt>
                  <dd className="font-medium tabular-nums text-site-navy">{row.value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 border-t border-site-border pt-4 text-sm leading-relaxed text-site-body">
              {copy.explain[variant]}
            </p>
          </div>

          {selectedPreset === null ? null : (
            <p className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-relaxed text-site-body">
              {selectedPreset.result}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 text-sm leading-relaxed text-site-body">
        <p>{copy.volumeNote}</p>
        <p>{copy.rateNote}</p>
        <p>{copy.payoutNote}</p>
      </div>

      <p className="text-xs leading-relaxed text-site-body">{copy.disclaimer}</p>
    </div>
  );
}
