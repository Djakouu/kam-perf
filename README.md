# Lighthouse CPU Analyzer for Kameleoon

This tool calculates JavaScript CPU execution time for specific entities (Kameleoon) on a given URL, using a methodology similar to [Third-Party Web](https://github.com/patrickhulce/third-party-web).

## Methodology

1.  **Lighthouse Run**: The tool runs Google Lighthouse programmatically using the **Mobile** preset. This emulates a slow 4G network and a mid-tier mobile device CPU (4x slowdown).
2.  **CPU Time Extraction**: It extracts data from the `bootup-time` audit in Lighthouse.
    *   **Included**: Script parsing, compilation, and execution time.
    *   **Excluded**: Network download time, DNS resolution, TCP connection time.
3.  **Attribution**:
    *   Scripts are identified by their URL.
    *   Script URLs are matched against domain patterns defined in `src/entities.json`.
    *   CPU time is aggregated per entity.

## Usage

### Prerequisites

*   Node.js (v18+ recommended)
*   Google Chrome installed

### Installation

```bash
npm install
```

### Running the Analysis

```bash
npm start -- --url https://example.com
```

### Options

*   `--url`, `-u`: The URL to analyze (required).
*   `--raw`, `-r`: Export the raw `bootup-time` audit data to `lighthouse-cpu-raw.json`.

### Example Output

```json
{
  "url": "https://example.com",
  "entities": {
    "Kameleoon": {
      "cpuTimeMs": 312,
      "scripts": [
        { "url": "https://static.kameleoon.com/css/customers/...", "cpuTimeMs": 120 }
      ]
    },
    
  }
}
```

## Limitations vs HTTP Archive & Third-Party Web

*   **Single Run vs Aggregate**: Third-Party Web presents "Average Impact" based on millions of page loads from the HTTP Archive. This tool runs a single test on your local machine. Results can vary significantly based on your machine's current load, network conditions, and the specific page load.
*   **Device Emulation**: While we use Lighthouse's mobile emulation, your actual hardware CPU performance affects the baseline before throttling. HTTP Archive runs on standardized hardware.
*   **Unattributable Time**: Lighthouse may report some CPU time as "Unattributable" or under generic categories that cannot be mapped to a specific script URL. These are excluded from the entity totals.

## Configuration

You can add or modify entities in `src/entities.json`.

```json
[
  {
    "name": "New Entity",
    "domains": ["*.newentity.com"],
    "homepage": "https://newentity.com"
  }
]
```
