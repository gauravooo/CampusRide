/**
 * CampusRide Client-Side AI Fleet Demand Forecaster & Autonomous Rebalancer
 * 
 * Zero-Cost Edge ML Architecture:
 * - Pure JavaScript implementation of a RandomForestRegressor ensemble.
 * - Runs 100% in-browser on Cloudflare Pages without Python or Docker dependencies.
 * - Provides predictive demand forecasting across all 10 IIM Bodh Gaya hubs.
 * - Implements a greedy spatial min-cost vehicle routing rebalance planner.
 */

import { haversineDistance } from '../utils/geo';

// ---------------------------------------------------------------------------
// 1. Core Random Forest Regressor Engine (Pure JavaScript)
// ---------------------------------------------------------------------------

class DecisionTreeNode {
  constructor({ feature = null, threshold = null, left = null, right = null, value = null } = {}) {
    this.feature = feature;
    this.threshold = threshold;
    this.left = left;
    this.right = right;
    this.value = value;
  }

  isLeaf() {
    return this.value !== null;
  }
}

class DecisionTreeRegressor {
  constructor(maxDepth = 6, minSamplesSplit = 4) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.root = null;
  }

  fit(X, y) {
    this.root = this._buildTree(X, y, 0);
  }

  _variance(y) {
    if (y.length <= 1) return 0;
    const mean = y.reduce((a, b) => a + b, 0) / y.length;
    return y.reduce((sum, val) => sum + (val - mean) ** 2, 0) / y.length;
  }

  _buildTree(X, y, depth) {
    const numSamples = X.length;
    if (numSamples === 0) return new DecisionTreeNode({ value: 0.3 });

    const meanValue = y.reduce((a, b) => a + b, 0) / numSamples;

    // Base cases
    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || this._variance(y) < 1e-6) {
      return new DecisionTreeNode({ value: meanValue });
    }

    const numFeatures = X[0].length;
    let bestFeature = null;
    let bestThreshold = null;
    let bestScore = Infinity;
    let bestSplits = null;

    // Evaluate potential feature splits
    for (let f = 0; f < numFeatures; f++) {
      const values = Array.from(new Set(X.map((row) => row[f]))).sort((a, b) => a - b);
      if (values.length <= 1) continue;

      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i + 1]) / 2;
        const leftIdxs = [];
        const rightIdxs = [];

        for (let j = 0; j < numSamples; j++) {
          if (X[j][f] <= threshold) leftIdxs.push(j);
          else rightIdxs.push(j);
        }

        if (leftIdxs.length === 0 || rightIdxs.length === 0) continue;

        const leftY = leftIdxs.map((idx) => y[idx]);
        const rightY = rightIdxs.map((idx) => y[idx]);

        const score = leftIdxs.length * this._variance(leftY) + rightIdxs.length * this._variance(rightY);

        if (score < bestScore) {
          bestScore = score;
          bestFeature = f;
          bestThreshold = threshold;
          bestSplits = {
            leftX: leftIdxs.map((idx) => X[idx]),
            leftY,
            rightX: rightIdxs.map((idx) => X[idx]),
            rightY
          };
        }
      }
    }

    if (!bestSplits) {
      return new DecisionTreeNode({ value: meanValue });
    }

    const leftChild = this._buildTree(bestSplits.leftX, bestSplits.leftY, depth + 1);
    const rightChild = this._buildTree(bestSplits.rightX, bestSplits.rightY, depth + 1);

    return new DecisionTreeNode({
      feature: bestFeature,
      threshold: bestThreshold,
      left: leftChild,
      right: rightChild
    });
  }

  predictRow(node, row) {
    if (node.isLeaf()) return node.value;
    if (row[node.feature] <= node.threshold) {
      return this.predictRow(node.left, row);
    }
    return this.predictRow(node.right, row);
  }

  predict(x) {
    return this.predictRow(this.root, x);
  }
}

export class RandomForestRegressor {
  constructor(nEstimators = 25, maxDepth = 6) {
    this.nEstimators = nEstimators;
    this.maxDepth = maxDepth;
    this.trees = [];
  }

  fit(X, y) {
    this.trees = [];
    const n = X.length;

    for (let i = 0; i < this.nEstimators; i++) {
      // Bootstrap sampling with replacement
      const sampleX = [];
      const sampleY = [];
      for (let j = 0; j < n; j++) {
        const randIdx = Math.floor(Math.random() * n);
        sampleX.push(X[randIdx]);
        sampleY.push(y[randIdx]);
      }

      const tree = new DecisionTreeRegressor(this.maxDepth, 4);
      tree.fit(sampleX, sampleY);
      this.trees.push(tree);
    }
  }

  predict(row) {
    if (this.trees.length === 0) return 0.35;
    const predictions = this.trees.map((tree) => tree.predict(row));
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    return Math.max(0.1, Math.min(0.95, mean));
  }
}

// ---------------------------------------------------------------------------
// 2. Model Singleton & Campus Mobility Dataset
// ---------------------------------------------------------------------------

let _singletonModel = null;

export function getTrainedModel() {
  if (_singletonModel) return _singletonModel;

  const X = [];
  const y = [];

  // Generate synthetic training observations encoding IIM Bodh Gaya mobility patterns
  // Features: [hour (0-23), is_weekend (0/1), hub_id (1-10)]
  // Target: demand_ratio (0.0 to 1.0)
  for (let hour = 0; hour < 24; hour++) {
    for (let weekend of [0, 1]) {
      for (let hubId = 1; hubId <= 10; hubId++) {
        let demand = 0.30;

        if (hubId === 2) {
          // Academic Block: peak during weekday lecture hours
          if (hour >= 8 && hour <= 17 && !weekend) demand = 0.88;
          else if (hour >= 18 && hour <= 21) demand = 0.45;
          else demand = 0.15;
        } else if (hubId === 3) {
          // Mess / Annapurna: peak dining hours
          if ([8, 9, 13, 14, 20, 21].includes(hour)) demand = 0.92;
          else if ([12, 19].includes(hour)) demand = 0.65;
          else demand = 0.20;
        } else if ([5, 6, 7, 8, 9, 10].includes(hubId)) {
          // Student Hostels: evening & night aggregation, morning rush to academic block
          if (hour >= 21 || hour <= 7) demand = 0.80;
          else if (hour >= 8 && hour <= 9) demand = 0.20;
          else demand = 0.40;
        } else if (hubId === 4) {
          // Sports Complex / Udaan: evening recreation
          if (hour >= 17 && hour <= 20) demand = 0.82;
          else demand = 0.25;
        } else if (hubId === 1) {
          // Main Gate: campus transit connections
          if ([8, 9, 17, 18].includes(hour)) demand = 0.70;
          else demand = 0.35;
        }

        // Slight natural variance for realistic bagging
        const noise = (Math.sin(hour * 3.7 + hubId * 2.1) * 0.03);
        const finalDemand = Math.max(0.1, Math.min(0.95, demand + noise));

        X.push([hour, weekend, hubId]);
        y.push(finalDemand);
      }
    }
  }

  const model = new RandomForestRegressor(25, 6);
  model.fit(X, y);
  _singletonModel = model;
  return _singletonModel;
}

// ---------------------------------------------------------------------------
// 3. Demand Forecasting & Deficit Analyzer
// ---------------------------------------------------------------------------

export function predictHubDemands(hubs, cycles, customHour = null, customIsWeekend = null) {
  if (!Array.isArray(hubs) || hubs.length === 0) return [];
  const safeCycles = Array.isArray(cycles) ? cycles : [];

  const model = getTrainedModel();
  const now = new Date();
  const hour = customHour !== null ? customHour : now.getHours();
  const isWeekend = customIsWeekend !== null ? customIsWeekend : (now.getDay() === 0 || now.getDay() === 6 ? 1 : 0);

  return hubs.map((hub) => {
    const currentCount = safeCycles.filter(
      (c) => c.hubId === hub.id && c.status === 'available'
    ).length;

    // Model feature vector: [hour, isWeekend, hubId]
    const predictedRatio = model.predict([hour, isWeekend, hub.id]);
    const predictedDemand = Math.max(1, Math.round(predictedRatio * (hub.capacity || 25)));
    const deficit = Math.max(0, predictedDemand - currentCount);
    const surplus = Math.max(0, currentCount - predictedDemand);

    let severity = 'optimal';
    if (deficit >= 6) severity = 'critical';
    else if (deficit >= 4) severity = 'high';
    else if (deficit >= 2) severity = 'medium';
    else if (deficit > 0) severity = 'low';

    let recommendedAction = 'Optimal fleet distribution.';
    if (deficit > 0) {
      recommendedAction = `Rebalance Alert: Shift +${deficit} cycles to ${hub.name} to fulfill anticipated rush.`;
    } else if (surplus > 4) {
      recommendedAction = `Surplus Station: ${surplus} cycles available for redistribution to deficit stations.`;
    }

    return {
      hubId: hub.id,
      hubName: hub.name,
      capacity: hub.capacity || 25,
      currentCount,
      predictedDemand,
      deficit,
      surplus,
      netBalance: currentCount - predictedDemand,
      severity,
      recommendedAction
    };
  }).sort((a, b) => b.deficit - a.deficit);
}

// ---------------------------------------------------------------------------
// 4. Autonomous Fleet Rebalancing Optimizer (Greedy Spatial Min-Cost Flow)
// ---------------------------------------------------------------------------

/**
 * Computes an optimal route plan to resolve hub deficits by moving available cycles
 * from surplus hubs to nearest deficit hubs.
 */
export function generateRebalancePlan(hubs, cycles, customHour = null, customIsWeekend = null) {
  const forecasts = predictHubDemands(hubs, cycles, customHour, customIsWeekend);

  const deficitHubs = forecasts
    .filter((f) => f.deficit > 0)
    .map((f) => ({ ...f, remainingDeficit: f.deficit }));

  const surplusHubs = forecasts
    .filter((f) => f.surplus > 0)
    .map((f) => ({ ...f, remainingSurplus: f.surplus }));

  const routes = [];
  let totalCyclesToMove = 0;

  // For each deficit station, greedily borrow from the closest surplus station
  for (const target of deficitHubs) {
    if (target.remainingDeficit <= 0) continue;

    const targetHub = hubs.find((h) => h.id === target.hubId);
    if (!targetHub) continue;

    // Sort surplus hubs by proximity to target
    const sortedDonors = surplusHubs
      .filter((s) => s.remainingSurplus > 0)
      .map((s) => {
        const donorHub = hubs.find((h) => h.id === s.hubId);
        const dist = donorHub ? haversineDistance(donorHub.lat, donorHub.lng, targetHub.lat, targetHub.lng) : Infinity;
        return { donor: s, donorHub, dist };
      })
      .sort((a, b) => a.dist - b.dist);

    for (const { donor, dist } of sortedDonors) {
      if (target.remainingDeficit <= 0) break;
      if (donor.remainingSurplus <= 0) continue;

      const transferCount = Math.min(target.remainingDeficit, donor.remainingSurplus);
      if (transferCount <= 0) continue;

      donor.remainingSurplus -= transferCount;
      target.remainingDeficit -= transferCount;
      totalCyclesToMove += transferCount;

      routes.push({
        id: `route-${donor.hubId}-${target.hubId}`,
        fromHubId: donor.hubId,
        fromHubName: donor.hubName,
        toHubId: target.hubId,
        toHubName: target.hubName,
        count: transferCount,
        distanceMeters: dist === Infinity ? 350 : Math.round(dist)
      });
    }
  }

  return {
    routes,
    totalCyclesToMove,
    unresolvedDeficit: deficitHubs.reduce((acc, d) => acc + d.remainingDeficit, 0),
    forecasts
  };
}

/**
 * Executes the rebalancing plan by re-assigning cycles from donor hubs to receiver hubs.
 * Returns the updated cycles array with updated hubId and GPS coordinates.
 */
export function executeRebalancePlan(hubs, cycles, plan) {
  if (!plan || !Array.isArray(plan.routes) || plan.routes.length === 0) {
    return { updatedCycles: cycles, movedCount: 0 };
  }

  const updatedCycles = [...cycles];
  let movedCount = 0;

  for (const route of plan.routes) {
    const { fromHubId, toHubId, count } = route;
    const targetHub = hubs.find((h) => h.id === toHubId);
    if (!targetHub) continue;

    // Find available cycles currently stationed at donor hub
    let transferred = 0;
    for (let i = 0; i < updatedCycles.length && transferred < count; i++) {
      const cycle = updatedCycles[i];
      if (cycle.hubId === fromHubId && cycle.status === 'available') {
        // Relocate cycle to destination hub with realistic parking radius jitter
        const latJitter = (Math.random() - 0.5) * 0.0003;
        const lngJitter = (Math.random() - 0.5) * 0.0003;

        updatedCycles[i] = {
          ...cycle,
          hubId: toHubId,
          lat: targetHub.lat + latJitter,
          lng: targetHub.lng + lngJitter
        };
        transferred++;
        movedCount++;
      }
    }
  }

  return {
    updatedCycles,
    movedCount
  };
}
