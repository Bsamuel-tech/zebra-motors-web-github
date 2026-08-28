// ---------------------------------------------------------------------------
// WHAT IF: BUSINESS SIMULATION (admin only)
// ---------------------------------------------------------------------------
// Pure calculation functions, no database access, so this file is safe to
// import from a client component (components/admin/AdminWhatIfSimulator.js).
// The page that renders that component (app/admin/(protected)/ai/what-if)
// reads the real baseline (current fleet, real non-demo bookings) server
// side and passes it in as props, this file never invents that part.
//
// HONESTY RULES THIS FILE FOLLOWS, per the platform spec:
//   1. Every number in the output is labelled one of:
//      ASSUMPTION  - a value the admin typed in, not measured
//      ESTIMATE    - arithmetic derived from real, currently configured data
//      PROJECTION  - a forward-looking number built from assumptions, never
//                    presented as a prediction of what will actually happen
//   2. Zebra Motors has close to zero real (non-demo) bookings recorded yet
//      (see lib/db/bookings.js). That means there is no historical demand
//      curve to fit a forecast to. This file NEVER tries to predict booking
//      volume, price elasticity, or seasonality from data that does not
//      exist. Booking volume and rental duration are always admin-entered
//      assumptions, clearly labelled as such, not model output.
//   3. generateBusinessExplanation() always states plainly that actual
//      demand response to a price or fleet change cannot be known without
//      historical data, this is not a caveat buried in fine print.
// ---------------------------------------------------------------------------

// baseline shape (computed server-side from real data):
//   {
//     fleetCount: number,                 // real, vehicles.length
//     avgDailyRateRWF: number,            // real, average of midRateRWF across fleet
//     minDailyRateRWF: number,            // real
//     maxDailyRateRWF: number,            // real
//     realBookingsCount: number,          // real, non-demo bookings all time
//     hasSufficientHistory: boolean,      // real, always false until this grows
//   }

// inputs shape (from the admin form, all admin-entered assumptions):
//   {
//     priceAdjustPct: number,           // e.g. 10 means +10%
//     fleetSizeChange: number,          // e.g. 2 means add 2 vehicles, -1 remove one
//     assumedMonthlyBookings: number,   // ASSUMPTION, admin's own estimate
//     assumedAvgRentalDays: number,     // ASSUMPTION, admin's own estimate
//   }

export const MIN_BOOKINGS_FOR_FORECAST = 30;

export function hasSufficientHistory(realBookingsCount) {
  return realBookingsCount >= MIN_BOOKINGS_FOR_FORECAST;
}

export function calculateScenarioMetrics(baseline, inputs) {
  const priceAdjustPct = Number(inputs.priceAdjustPct) || 0;
  const fleetSizeChange = Number(inputs.fleetSizeChange) || 0;
  const assumedMonthlyBookings = Math.max(0, Number(inputs.assumedMonthlyBookings) || 0);
  const assumedAvgRentalDays = Math.max(0, Number(inputs.assumedAvgRentalDays) || 0);

  // ESTIMATE: arithmetic on the real, currently configured price range.
  const scenarioAvgDailyRateRWF = Math.round(baseline.avgDailyRateRWF * (1 + priceAdjustPct / 100));
  const scenarioFleetCount = Math.max(0, baseline.fleetCount + fleetSizeChange);

  // PROJECTION: built entirely from the admin's own assumptions above, not
  // from any measured demand curve. Revenue = assumed bookings x assumed
  // days x scenario daily rate.
  const projectedMonthlyRevenueRWF = Math.round(
    assumedMonthlyBookings * assumedAvgRentalDays * scenarioAvgDailyRateRWF
  );

  // ESTIMATE: naive utilization check, does the assumed booking volume
  // exceed what the scenario fleet could physically service in a 30 day
  // month, assuming every vehicle can only serve one booking at a time and
  // no scheduling gaps. This is a capacity ceiling, not a demand forecast.
  const scenarioFleetCapacityBookingsPerMonth =
    assumedAvgRentalDays > 0 ? Math.floor((scenarioFleetCount * 30) / assumedAvgRentalDays) : null;
  const exceedsFleetCapacity =
    scenarioFleetCapacityBookingsPerMonth != null && assumedMonthlyBookings > scenarioFleetCapacityBookingsPerMonth;

  return {
    inputs: { priceAdjustPct, fleetSizeChange, assumedMonthlyBookings, assumedAvgRentalDays },
    estimates: {
      scenarioAvgDailyRateRWF,
      scenarioFleetCount,
      scenarioFleetCapacityBookingsPerMonth,
    },
    projections: {
      projectedMonthlyRevenueRWF,
    },
    flags: {
      exceedsFleetCapacity,
    },
  };
}

export function compareBaseline(baseline, scenarioMetrics) {
  const baselineAssumedMonthlyRevenueRWF = Math.round(
    scenarioMetrics.inputs.assumedMonthlyBookings *
      scenarioMetrics.inputs.assumedAvgRentalDays *
      baseline.avgDailyRateRWF
  );
  const revenueDeltaRWF =
    scenarioMetrics.projections.projectedMonthlyRevenueRWF - baselineAssumedMonthlyRevenueRWF;
  const revenueDeltaPct =
    baselineAssumedMonthlyRevenueRWF > 0 ? Math.round((revenueDeltaRWF / baselineAssumedMonthlyRevenueRWF) * 1000) / 10 : null;

  return {
    baselineAssumedMonthlyRevenueRWF,
    revenueDeltaRWF,
    revenueDeltaPct,
    fleetCountDelta: scenarioMetrics.estimates.scenarioFleetCount - baseline.fleetCount,
  };
}

export function generateBusinessExplanation(baseline, scenarioMetrics, comparison) {
  const lines = [];

  lines.push({
    type: "ASSUMPTION",
    text: `This scenario assumes ${scenarioMetrics.inputs.assumedMonthlyBookings} bookings per month at an average of ${scenarioMetrics.inputs.assumedAvgRentalDays} rental days each. These are numbers you entered, not a measured booking pattern.`,
  });

  lines.push({
    type: "ESTIMATE",
    text: `At a ${scenarioMetrics.inputs.priceAdjustPct >= 0 ? "+" : ""}${scenarioMetrics.inputs.priceAdjustPct}% price adjustment, the average daily rate across the fleet moves from RWF ${baseline.avgDailyRateRWF.toLocaleString("en-US")} to RWF ${scenarioMetrics.estimates.scenarioAvgDailyRateRWF.toLocaleString("en-US")}. This is arithmetic on the currently published price range, not a prediction of what customers will pay.`,
  });

  if (scenarioMetrics.inputs.fleetSizeChange !== 0) {
    lines.push({
      type: "ESTIMATE",
      text: `Fleet size in this scenario changes from ${baseline.fleetCount} to ${scenarioMetrics.estimates.scenarioFleetCount} vehicles.`,
    });
  }

  lines.push({
    type: "PROJECTION",
    text: `Under these assumptions, projected monthly revenue is approximately RWF ${scenarioMetrics.projections.projectedMonthlyRevenueRWF.toLocaleString("en-US")}, compared with RWF ${comparison.baselineAssumedMonthlyRevenueRWF.toLocaleString("en-US")} at the current price (same assumed booking volume), a difference of ${comparison.revenueDeltaPct != null ? `${comparison.revenueDeltaPct >= 0 ? "+" : ""}${comparison.revenueDeltaPct}%` : "n/a"}. This is a calculation from the assumptions above, not a forecast of actual results.`,
  });

  if (scenarioMetrics.flags.exceedsFleetCapacity) {
    lines.push({
      type: "ASSUMPTION",
      text: `The assumed booking volume exceeds what ${scenarioMetrics.estimates.scenarioFleetCount} vehicle${scenarioMetrics.estimates.scenarioFleetCount === 1 ? "" : "s"} could physically service in a typical month at ${scenarioMetrics.inputs.assumedAvgRentalDays} days per rental (about ${scenarioMetrics.estimates.scenarioFleetCapacityBookingsPerMonth} bookings). Increase fleet size or reduce the assumed booking volume for a realistic scenario.`,
    });
  }

  lines.push({
    type: "PROJECTION",
    text: "How real customers would actually respond to a price change or a larger fleet, whether demand would rise, fall, or stay flat, cannot be known from the data available today. Zebra Motors does not yet have enough recorded booking history to fit a real demand forecast, this simulation only shows what the numbers do under the assumptions you chose.",
  });

  return lines;
}

export function runBusinessScenario(baseline, inputs) {
  const scenarioMetrics = calculateScenarioMetrics(baseline, inputs);
  const comparison = compareBaseline(baseline, scenarioMetrics);
  const explanation = generateBusinessExplanation(baseline, scenarioMetrics, comparison);
  return { baseline, scenarioMetrics, comparison, explanation };
}
