# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Download five years of free public data (no keys) for offline demo snapshots."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def _run(cmd: list[str]) -> None:
    print(" ".join(cmd))
    subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Download free public 5-year snapshots")
    parser.add_argument("--site-id", default="MCW")
    parser.add_argument("--latitude", type=float, default=43.6)
    parser.add_argument("--longitude", type=float, default=-93.2)
    parser.add_argument("--years", type=int, default=5)
    parser.add_argument("--pvdaq-csv-file", default="data/raw/pvdaq_test.csv")
    parser.add_argument("--openwind-csv-file", default="data/raw/openwind_test.csv")
    args = parser.parse_args()

    scripts_dir = Path(__file__).resolve().parent
    py = sys.executable

    # Free no-key APIs
    _run([
        py,
        str(scripts_dir / "capture_nasa_power_snapshot.py"),
        "--site-id",
        args.site_id,
        "--latitude",
        str(args.latitude),
        "--longitude",
        str(args.longitude),
        "--years",
        str(args.years),
    ])

    _run([
        py,
        str(scripts_dir / "capture_open_meteo_archive_snapshot.py"),
        "--site-id",
        args.site_id,
        "--latitude",
        str(args.latitude),
        "--longitude",
        str(args.longitude),
        "--years",
        str(args.years),
    ])

    # Free public CSV datasets (local or downloaded by user beforehand)
    _run([
        py,
        str(scripts_dir / "capture_pvdaq_snapshot.py"),
        "--csv-file",
        args.pvdaq_csv_file,
        "--site-id",
        args.site_id,
        "--asset-id",
        f"{args.site_id}-PVDAQ-INV-01",
    ])

    _run([
        py,
        str(scripts_dir / "capture_openwind_snapshot.py"),
        "--csv-file",
        args.openwind_csv_file,
        "--site-id",
        args.site_id,
        "--asset-id",
        f"{args.site_id}-WT-01",
        "--years",
        str(args.years),
    ])

    print("free public 5-year download complete")


if __name__ == "__main__":
    main()
