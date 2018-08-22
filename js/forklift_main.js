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

let completed = 0;
const steps = Benchmark.CountSteps();
let success = true;

function ShowBox(benchmarkName, stepName) {
  completed++;
  document.getElementById('main-banner').innerHTML = `Running Forklift...<br>${benchmarkName}.${stepName}`;
  document.getElementById('progress-bar').style.width = `
    ${((completed) / steps) * 100}%`;
}

function AddResult(name, result) {}

function AddError(name, error) {
  console.log(name + ': ' + error.message);
  if (error == 'TypedArrayUnsupported') {
    AddResult(name, '<b>Unsupported<\/b>');
  } else if (error == 'PerformanceNowUnsupported') {
    AddResult(name, '<b>Timer error<\/b>');
  } else {
    AddResult(name, '<b>Error</b>');
  }
  success = false;
}

function AddCycles(score) {
  const status = document.getElementById('main-banner');
  if (success) {
    status.innerHTML = `Forklift Cycles: ${score}`;
  } else {
    status.innerHTML = `Forklift Cycles (incomplete): ${score}`;
  }
  document.getElementById('progress-bar-container').style.visibility = 'hidden';
  document.getElementById('bottom-text').style.visibility = 'visible';
  document.getElementById('inside-anchor').removeChild(document.getElementById('bar-appendix'));
  document.getElementById('alertbox').style.visibility = 'hidden';
}

function Run() {
  document.getElementById('main-banner').innerHTML = 'Running Forklift...';
  // append the progress bar elements..
  document.getElementById('bar-appendix').innerHTML =
    `<br/><div class="progress" id="progress-bar-container" style="visibility:hidden"><div class="progress-bar" role="progressbar" style="width: 0%;" id="progress-bar"></div></div>`;
  const anchor = document.getElementById('run-forklift');
  const parent = document.getElementById('main-container');
  parent.appendChild(document.getElementById('inside-anchor'));
  parent.removeChild(anchor);

  document.getElementById('startup-text').innerHTML = '';

  document.getElementById('progress-bar-container').style.visibility = 'visible';

  Benchmark.RunBenchmarks({
    NotifyStart: ShowBox,
    NotifyError: AddError,
    NotifyResult: AddResult,
    NotifyScore: AddCycles,
  });
}
