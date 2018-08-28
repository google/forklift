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


const tuningMode = false;
const tuningTarget = 10000;
const numberOfIterations = 5;

// Simple framework for running the benchmark suites and
// computing a score based on the timing measurements.

// Override the alert function to throw an exception instead.
alert = function (s) {
  throw 'Alert called with argument: ' + s;
};

// Replace Math.random with a 100% deterministic alternative.
//
// This is intended to make the benchmark results more predictable.
Math.random = (() => {
  let seed = 49734321;
  return () => {
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

function navigateIframe(src, onload) {
  const iframe = document.querySelector('#iframe');
  if (!iframe) {
    throw new DOMException('expected iframe element');
  }

  const promise = new Promise((resolve, reject) => {
    iframe.onload = async function () {
      resolve(await onload(iframe));
    };
  })
  iframe.src = src + '&' + Date.now();
  return promise;
}

function sendEnterKeypress(el) {
  const e = document.createEvent('HTMLEvents');
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
    const todoEntry = iframe.contentDocument.querySelector('.new-todo');
    if (todoEntry) {
      return;
    }
  }
}

function checkTuning(suite, result) {
  if (!tuningMode) {
    return;
  }

  let originalResult = result;
  if (suite.scaling) originalResult = result / suite.scaling;

  if (result < tuningTarget * 0.95) {
    console.log(`WARNING: ${suite.name}'s result ${result} is too low, scaling should be set to ${tuningTarget/originalResult}`);
  } else if (result > tuningTarget * 1.05) {
    console.log(`WARNING: ${suite.name}'s result ${result} is too high, scaling should be set to ${tuningTarget/originalResult}`);
  }
}

// A benchmark step has a name (string) and a function that will be run
// to do the performance measurement.
class BenchmarkStep {
  constructor(fn) {
    this.fn = fn;
  }
}

// Benchmarks consist of a name and the set of steps.
class Benchmark {
  constructor(name, scaling, src, steps) {
    this.name = name;
    this.scaling = scaling;
    this.src = src;
    this.steps = steps;
  }

  static Add(suite) {
    Benchmark.suites.push(suite);
  }

  static recycleIframe(options) {
    const iframeHolder = document.querySelector('#iframe-holder');

    // Delete iframe if it exists.
    if (this.iframe) {
      this.iframe.parentNode.removeChild(this.iframe);
      this.iframe = null;
    }

    if (!options.create) {
      // We want to only delete the iframe and hide the iframe holder.
      iframeHolder.classList.remove('iframe-holder');
      iframeHolder.style = 'visibility: hidden';
      return;
    }

    // Create new iframe.
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'iframe';
    this.iframe.scrolling = 'no';

    // Show iframe holder div.
    iframeHolder.appendChild(this.iframe);
    iframeHolder.className = 'iframe-holder';
    iframeHolder.style = 'visibility: visible';
  }

  static async Navigate(src, onload) {
    Benchmark.recycleIframe({create: true});
    await navigateIframe(src, onload);
  }

  // Counts the total number of registered benchmarks.
  //
  // Useful for showing progress as a percentage.
  static CountSteps() {
    let result = 0;
    for (let suite of Benchmark.suites) {
      result += numberOfIterations * suite.steps.length;
    }
    // Increase the count by 1 so the last step doesn't appear 'finished'
    // in the progress bar.
    result++;
    return result;
  }

  // Computes the geometric mean of a set of numbers.
  static GeometricMean(numbers) {
    let log = 0;
    for (let number of numbers) {
      log += Math.log(number);
    }
    return Math.pow(Math.E, log / numbers.length);
  }


  // Computes the geometric mean of a set of throughput time measurements.
  static GeometricMeanTime(measurements) {
    let log = 0;
    for (let measurement of measurements) {
      log += Math.log(measurement.time);
    }
    return Math.pow(Math.E, log / measurements.length);
  }

  // Converts a score value to a string with at least three significant
  // digits.
  static FormatScore(value) {
    return (value > 100) ? value.toFixed(0) : value.toPrecision(3);
  }

  // Notifies the runner that we're done running a step in
  // the benchmark. This can be useful to report progress.
  NotifyStep(result) {
  }

  // Notifies the runner that we're done with running a benchmark and that
  // we have a result which can be reported to the user if needed.
  NotifyResult(result) {
    Benchmark.scores.push(result);
    if (this.runner.NotifyResult) {
      const formatted = Benchmark.FormatScore(result);
      this.runner.NotifyResult(this.name, formatted);
    }
  }

  // Notifies the runner that running a benchmark resulted in an error.
  NotifyError(error) {
    if (this.runner.NotifyError) {
      this.runner.NotifyError(this.name, error);
    }
  }

  // Runs a benchmark and calculates the amount of time it took to complete.
  async RunSteps(runner) {
    this.runner = runner;
    let elapsed = 0;

    for (let step of this.steps) {
      if (runner.NotifyStart)
        runner.NotifyStart(this.name, step.fn.name);

      const iframe = document.querySelector('#iframe');
      const start = performance.now();
      const shouldScore = await step.fn(iframe);
      if (shouldScore !== false) {
        elapsed += performance.now() - start;
      }
    }

    return elapsed;
  }

  static async RunIterations(runner, suite) {
    suite.results = [];

    for (let i = 0; i < numberOfIterations; i++) {
      Benchmark.recycleIframe({ create: true });
      await navigateIframe(suite.src, async () => {
        await pageLoaded(this.iframe);
        suite.results.push(await suite.RunSteps(runner));
      });
    }

    const scaling = suite.scaling ? suite.scaling : 1;
    const result = Benchmark.GeometricMean(suite.results) * scaling;
    if (tuningMode) {
      console.log(suite.name);
      console.log(`results: ${JSON.stringify(suite.results)}`);
      console.log(`mean result: ${result/scaling}`);
      console.log(`scaled result: ${result}`);
    }
    return result;
  }

  // Runs all registered benchmarks.  Once done, the final score is
  // reported to the runner.
  static async RunBenchmarks(runner) {
    Benchmark.scores = [];

    for (let suite of Benchmark.suites) {
      const result = await Benchmark.RunIterations(runner, suite);
      checkTuning(suite, result);
      suite.NotifyResult(result);
    }

    // We've completed all of the steps, so update the progress bar and
    // sleep briefly to let the UI update.
    Benchmark.recycleIframe({create: false});
    if (runner.NotifyStart) runner.NotifyStart('Wrapping up');
    await sleep(100);

    // show final result
    if (runner.NotifyScore) {
      const score = Benchmark.GeometricMean(Benchmark.scores);
      const formatted = Benchmark.FormatScore(score);
      runner.NotifyScore(formatted);
    }
  }
}

// Keeps track of all declared benchmark suites.
//
// TODO(pwnall): This can take advantage of the ES class fields proposal, once
//               that is formalized and adopted by all major browsers.
Benchmark.suites = [];
