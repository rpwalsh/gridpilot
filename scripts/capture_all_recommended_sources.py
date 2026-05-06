# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Capture five-year snapshots for recommended demo sources.

Recommended stack:
- Solar: PVDAQ (CSV export via URL or file)
- Wind: OpenWindSCADA (CSV via URL or file)
- Grid: EIA-930 API

This script runs available captures and skips those missing required input/auth.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


def _run(cmd: list[str]) -> int:
    print(" ".join(cmd))
    proc = subprocess.run(cmd)
    return proc.returncode


def main() -> None:
    parser = argparse.ArgumentParser(description="Capture recommended source snapshots")
    parser.add_argument("--years", type=int, default=5)

    parser.add_argument("--pvdaq-csv-url", default=None)
    parser.add_argument("--pvdaq-csv-file", default=None)
    parser.add_argument("--pvdaq-site-id", default="MCW")
    parser.add_argument("--pvdaq-asset-id", default="MCW-PVDAQ-INV-01")
    parser.add_argument("--pvdaq-capacity-kw", type=float, default=1000.0)

    parser.add_argument("--openwind-csv-url", default=None)
    parser.add_argument("--openwind-csv-file", default=None)
    parser.add_argument("--openwind-site-id", default="MCW")
    parser.add_argument("--openwind-asset-id", default="MCW-WT-01")
    parser.add_argument("--openwind-capacity-kw", type=float, default=2500.0)

    parser.add_argument("--eia-respondent", default="MISO")
    parser.add_argument("--eia-metrics", default="load,net_generation,load_forecast")

    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    python = sys.executable

    failures: list[str] = []

    if args.pvdaq_csv_url or args.pvdaq_csv_file:
        cmd = [
            python,
            str(root / "capture_pvdaq_snapshot.py"),
            "--site-id",
            args.pvdaq_site_id,
            "--asset-id",
            args.pvdaq_asset_id,
            "--capacity-kw",
            str(args.pvdaq_capacity_kw),
        ]
        if args.pvdaq_csv_url:
            cmd += ["--csv-url", args.pvdaq_csv_url]
        else:
            cmd += ["--csv-file", args.pvdaq_csv_file]

        if _run(cmd) != 0:
            failures.append("pvdaq")
    else:
        print("skip pvdaq: provide --pvdaq-csv-url or --pvdaq-csv-file")

    if args.openwind_csv_url or args.openwind_csv_file:
        cmd = [
            python,
            str(root / "capture_openwind_snapshot.py"),
            "--site-id",
            args.openwind_site_id,
            "--asset-id",
            args.openwind_asset_id,
            "--capacity-kw",
            str(args.openwind_capacity_kw),
            "--years",
            str(args.years),
        ]
        if args.openwind_csv_url:
            cmd += ["--csv-url", args.openwind_csv_url]
        else:
            cmd += ["--csv-file", args.openwind_csv_file]

        if _run(cmd) != 0:
            failures.append("openwind")
    else:
        print("skip openwind: provide --openwind-csv-url or --openwind-csv-file")

    if os.getenv("EIA_API_KEY", "").strip():
        cmd = [
            python,
            str(root / "capture_eia930_snapshot.py"),
            "--respondent",
            args.eia_respondent,
            "--years",
            str(args.years),
            "--metrics",
            args.eia_metrics,
        ]
        if _run(cmd) != 0:
            failures.append("eia930")
    else:
        print("skip eia930: EIA_API_KEY is not set")

    if failures:
        raise SystemExit(f"capture failures: {', '.join(failures)}")

    print("capture complete")


if __name__ == "__main__":
    main()
