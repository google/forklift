// Copyright 2009 the V8 project authors. All rights reserved.
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

(() => {
  Benchmark.Add(new Benchmark(
    'VanillaLargeDBCompact',
    814.65,
    'third_party/todomvc/vanilla-idb/index.html?open=0',
    [
      new BenchmarkStep(SetupRecreateDB),
      new BenchmarkStep(SetupRenavigate),
      new BenchmarkStep(SetupCompact),
      new BenchmarkStep(OpenDatabase),
      new BenchmarkStep(CloseDatabase),
    ]));

  // Delete and recreate a populated database, then close the DB.
  async function SetupRecreateDB(iframe) {
    await iframe.contentWindow.todo.storage.deleteDatabase();
    await iframe.contentWindow.todo.storage.open({ populated: true });
    iframe.contentWindow.todo.storage.closeDatabase();

    return false;  // Do not count this step in the elapsed time.
  }

  // Navigate away from the page and wait for the backing store to close.
  async function SetupRenavigate(iframe) {
    await Benchmark.Navigate(
      'third_party/todomvc/vanilla-idb/index.html?open=0',
      async (iframe) => {
        await waitForIndexedDBShutdown();
        await pageLoaded(iframe);
      });

    return false;  // Do not count this step in the elapsed time.
  }

  // Open the DB so that compaction can begin.
  async function SetupCompact(iframe) {
    await iframe.contentWindow.todo.storage.open({ populated: false });
    await sleep(500);
    iframe.contentWindow.todo.storage.closeDatabase();

    return false;  // Do not count this step in the elapsed time.
  }

  async function OpenDatabase(iframe) {
    await iframe.contentWindow.todo.storage.open({ populated: false });
  }

  async function CloseDatabase(iframe) {
    iframe.contentWindow.todo.storage.closeDatabase();

    return false;  // Do not count this step in the elapsed time.
  }
})();
