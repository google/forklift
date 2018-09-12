# Forklift

An IndexedDB-specific macrobenchmark that lets us measure progress,
guide future optimizations, and detect and respond to stability and
performance regressions in IndexedDB implementations.

## Usage

Check out the repository to a web server root and access it using your
web browser.  Click "Start Forklift" to start the benchmark.

## Prerequisites

* A web browser with IndexedDB and ES7 support.

* A web server that allows browser access to the benchmark site via
http:// or https://, since some IndexedDB implementations do not support
file:// origin loads.

## Limitations

This first edition of the benchmark was tested in the latest stable
versions of Chrome, Edge, Firefox, and Safari.  If you test it in other
settings, feel free to file an issue and we will update our docs with
what you have found.
