// Copyright 2013 the V8 project authors. All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
//     * Neither the name of Google Inc. nor the names of its
//       contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


// Performance.now is used in latency benchmarks, the fallback is Date.now.
var performance = performance || {};
performance.now = (function () {
  return performance.now ||
    performance.mozNow ||
    performance.msNow ||
    performance.oNow ||
    performance.webkitNow ||
    Date.now;
})();

var tuningMode = false;
var tuningTarget = 10000;
var numberOfIterations = 5;

// Simple framework for running the benchmark suites and
// computing a score based on the timing measurements.


// A benchmark has a name (string) and a function that will be run to
// do the performance measurement. The optional setup and tearDown
// arguments are functions that will be invoked before and after
// running the benchmark, but the running time of these functions will
// not be accounted for in the benchmark score.
function Benchmark(name, steps) {
  this.name = name;
  this.steps = steps;
}


// Benchmark results hold the benchmark and the measured time used to
// run the benchmark. The benchmark score is computed later once a
// full benchmark suite has run to completion.
function BenchmarkResult(benchmark, time) {
  this.benchmark = benchmark;
  this.time = time;
}


// Automatically convert results to numbers. Used by the geometric
// mean computation.
BenchmarkResult.prototype.valueOf = function () {
  return this.time;
}


// Suites of benchmarks consist of a name and the set of benchmarks in
// addition to the reference timing that the final score will be based
// on. This way, all scores are relative to a reference run and higher
// scores implies better performance.
function BenchmarkSuite(name, scaling, src, benchmark) {
  this.name = name;
  this.scaling = scaling;
  this.src = src;
  this.benchmark = benchmark;
}

BenchmarkSuite.Add = function (suite) {
  if (typeof BenchmarkSuite.suites === 'undefined') {
    // Keep track of all declared benchmark suites.
    BenchmarkSuite.suites = [];
  }
  BenchmarkSuite.suites.push(suite);
}


// Override the alert function to throw an exception instead.
alert = function (s) {
  throw "Alert called with argument: " + s;
};

// To make the benchmark results predictable, we replace Math.random
// with a 100% deterministic alternative.
BenchmarkSuite.ResetRNG = function () {
  Math.random = (function () {
    var seed = 49734321;
    return function () {
      // Robert Jenkins' 32 bit integer hash function.
      seed = ((seed + 0x7ed55d16) + (seed << 12)) & 0xffffffff;
      seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
      seed = ((seed + 0x165667b1) + (seed << 5)) & 0xffffffff;
      seed = ((seed + 0xd3a2646c) ^ (seed << 9)) & 0xffffffff;
      seed = ((seed + 0xfd7046c5) + (seed << 3)) & 0xffffffff;
      seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
      return (seed & 0xfffffff) / 0x10000000;
    };
  })();
}

BenchmarkSuite.recycleIframe = function (options) {
  var iframeHolder = document.querySelector('#iframe-holder');

  // Delete iframe if it exists.
  if (this.iframe) {
    this.iframe.parentNode.removeChild(this.iframe);
    this.iframe = null;
  }

  if (!options.create) {
    // We want to only delete the iframe and hide the iframe holder.
    iframeHolder.classList.remove("iframe-holder");
    iframeHolder.style = "visibility: hidden";
    return;
  }

  // Create new iframe.
  var iframe = document.createElement('iframe');
  iframe.id = "iframe";
  iframe.scrolling = "no";
  this.iframe = iframe;

  // Show iframe holder div.
  iframeHolder.appendChild(iframe);
  iframeHolder.className = "iframe-holder";
  iframeHolder.style = "visibility: visible";
}

function navigateIframe(src, onload) {
  var iframe = document.querySelector('#iframe');
  if (!iframe) {
    throw new DOMException("expected iframe element");
  }

  var promise = new Promise((resolve, reject) => {
    iframe.onload = async function () {
      resolve(await onload(iframe));
    };
  })
  iframe.src = src + '&' + Date.now();
  return promise;
}

BenchmarkSuite.Navigate = async function (src, onload) {
  BenchmarkSuite.recycleIframe({create: true});
  await navigateIframe(src, onload);
}

function sendEnterKeypress(el) {
  var e = document.createEvent('HTMLEvents');
  e.initEvent('keypress', true, true);
  e.key = 'Enter';
  e.keyCode = 13;
  e.which = 13;
  el.dispatchEvent(e);
}

// Promise-based sleep().
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// waitForIndexedDBShutdown() is an ES7 Promise-based function that
// sleeps for the amount of time it takes the browser to shut down its
// internal instances of IndexedDB.
// * Chromium: requires that all of the DB instances the page was using
// have been closed for more than 2 seconds.
// * WebKit: auto-closes DB if it's ephemeral and if not currently in
// use.
async function waitForIndexedDBShutdown(ms) {
  await sleep(3000);
}

// Promise-based requestAnimationFrame() helper.
function waitForRequestAnimationFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

async function pageLoaded(iframe) {
  while (true) {
    await waitForRequestAnimationFrame();
    var todoEntry = iframe.contentDocument.querySelector(".new-todo");
    if (todoEntry) {
      return;
    }
  }
}

function checkTuning(suite, result) {
  if (!tuningMode) {
    return;
  }

  var originalResult = result;
  if (suite.scaling) originalResult = result / suite.scaling;

  if (result < tuningTarget * 0.95) {
    console.log(`WARNING: ${suite.name}'s result ${result} is too low, scaling should be set to ${tuningTarget/originalResult}`);
  } else if (result > tuningTarget * 1.05) {
    console.log(`WARNING: ${suite.name}'s result ${result} is too high, scaling should be set to ${tuningTarget/originalResult}`);
  }
}


// Counts the total number of registered benchmarks. Useful for
// showing progress as a percentage.
BenchmarkSuite.CountBenchmarks = function () {
  var result = 0;
  var suites = BenchmarkSuite.suites;
  for (var i = 0; i < suites.length; i++) {
    result += numberOfIterations * suites[i].benchmark.steps.length;
  }
  // Increase the count by 1 so the last step doesn't appear "finished"
  // in the progress bar.
  result++;
  return result;
}


// Computes the geometric mean of a set of numbers.
BenchmarkSuite.GeometricMean = function (numbers) {
  var log = 0;
  for (var i = 0; i < numbers.length; i++) {
    log += Math.log(numbers[i]);
  }
  return Math.pow(Math.E, log / numbers.length);
}


// Computes the geometric mean of a set of throughput time measurements.
BenchmarkSuite.GeometricMeanTime = function (measurements) {
  var log = 0;
  for (var i = 0; i < measurements.length; i++) {
    log += Math.log(measurements[i].time);
  }
  return Math.pow(Math.E, log / measurements.length);
}


// Converts a score value to a string with at least three significant
// digits.
BenchmarkSuite.FormatScore = function (value) {
  if (value > 100) {
    return value.toFixed(0);
  } else {
    return value.toPrecision(3);
  }
}

// Notifies the runner that we're done running a single benchmark in
// the benchmark suite. This can be useful to report progress.
BenchmarkSuite.prototype.NotifyStep = function (result) {
  this.results.push(result);
  if (this.runner.NotifyStep) this.runner.NotifyStep(result.benchmark.name);
}

// Notifies the runner that we're done with running a suite and that
// we have a result which can be reported to the user if needed.
BenchmarkSuite.prototype.NotifyResult = function (result) {
  BenchmarkSuite.scores.push(result);
  if (this.runner.NotifyResult) {
    var formatted = BenchmarkSuite.FormatScore(result);
    this.runner.NotifyResult(this.name, formatted);
  }
}

BenchmarkSuite.prototype.NotifySkipped = function (runner) {
  BenchmarkSuite.scores.push(1); // push default reference score.
  if (runner.NotifyResult) {
    runner.NotifyResult(this.name, "Skipped");
  }
}

// Notifies the runner that running a benchmark resulted in an error.
BenchmarkSuite.prototype.NotifyError = function (error) {
  if (this.runner.NotifyError) {
    this.runner.NotifyError(this.name, error);
  }
  if (this.runner.NotifyStep) {
    this.runner.NotifyStep(this.name);
  }
}

// This function runs a suite and calculates the amount of time taken
// to complete the step.
BenchmarkSuite.prototype.RunSteps = async function (runner) {
  BenchmarkSuite.ResetRNG();
  this.runner = runner;
  var elapsed = 0;

  for (var step of this.benchmark.steps) {
    if (runner.NotifyStart) runner.NotifyStart(this.name);
    var iframe = document.querySelector('#iframe');
    var start = performance.now();
    var shouldScore = await step(iframe);
    if (shouldScore !== false) {
      elapsed += performance.now() - start;
    }
  }

  return elapsed;
}

BenchmarkSuite.RunIterations = async function (runner, suite) {
  var self = this;
  suite.results = [];

  for (var i = 0; i < numberOfIterations; i++) {
    BenchmarkSuite.recycleIframe({create: true});
    await navigateIframe(suite.src, async function () {
      await pageLoaded(self.iframe);
      var result = await suite.RunSteps(runner);
      suite.NotifyStep(new BenchmarkResult(this.benchmark, result));
    });
  }

  var scaling = suite.scaling ? suite.scaling : 1;
  var result = BenchmarkSuite.GeometricMean(suite.results) * scaling;
  if (tuningMode) {
    console.log(suite.name);
    console.log(`results: ${JSON.stringify(suite.results)}`);
    console.log(`mean result: ${result/scaling}`);
    console.log(`scaled result: ${result}`);
  }
  return result;
}

// Runs all registered benchmark suites and optionally yields between
// each individual benchmark to avoid running for too long in the
// context of browsers. Once done, the final score is reported to the
// runner.
BenchmarkSuite.RunSuites = async function (runner) {
  BenchmarkSuite.scores = [];

  for (var suite of BenchmarkSuite.suites) {
    var result = await BenchmarkSuite.RunIterations(runner, suite);
    checkTuning(suite, result);
    suite.NotifyResult(result);
  }

  // We've completed all of the steps, so update the progress bar and
  // sleep briefly to let the UI update.
  BenchmarkSuite.recycleIframe({create: false});
  if (runner.NotifyStart) runner.NotifyStart('Wrapping up');
  await sleep(100);

  // show final result
  if (runner.NotifyScore) {
    var score = BenchmarkSuite.GeometricMean(BenchmarkSuite.scores);
    var formatted = BenchmarkSuite.FormatScore(score);
    runner.NotifyScore(formatted);
  }
}
