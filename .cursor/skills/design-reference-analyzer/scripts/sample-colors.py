#!/usr/bin/env python3
"""Sample pixel colors from a reference image without third-party packages.

Converts the image to BMP with macOS `sips` (or loads a BMP directly) and reads
pixels with the standard library.

Usage:
  sample-colors.py IMAGE --info
  sample-colors.py IMAGE --at X,Y [--at X,Y ...] [--scale S]
  sample-colors.py IMAGE --dominant [N] [--region X,Y,W,H] [--scale S]

Coordinates are in CSS pixels when --scale is given (image px = CSS px * S),
otherwise in raw image pixels.
"""

import argparse
import os
import struct
import subprocess
import sys
import tempfile
from collections import Counter


def load_bmp(path):
    with open(path, "rb") as f:
        data = f.read()
    offset = struct.unpack_from("<I", data, 10)[0]
    width, height = struct.unpack_from("<ii", data, 18)
    bpp = struct.unpack_from("<H", data, 28)[0]
    if bpp not in (24, 32):
        sys.exit(f"unsupported BMP bit depth: {bpp}")
    top_down = height < 0
    height = abs(height)
    bytes_pp = bpp // 8
    row_size = (width * bytes_pp + 3) & ~3

    def pixel(x, y):
        row = y if top_down else height - 1 - y
        i = offset + row * row_size + x * bytes_pp
        b, g, r = data[i], data[i + 1], data[i + 2]
        return r, g, b

    return width, height, pixel


def open_image(path):
    if path.lower().endswith(".bmp"):
        return load_bmp(path)
    tmp = tempfile.NamedTemporaryFile(suffix=".bmp", delete=False)
    tmp.close()
    try:
        subprocess.run(
            ["sips", "-s", "format", "bmp", path, "--out", tmp.name],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        sys.exit("could not convert image: `sips` (macOS) is required for non-BMP input")
    try:
        return load_bmp(tmp.name)
    finally:
        os.unlink(tmp.name)


def to_hex(rgb):
    return "#%02x%02x%02x" % rgb


def parse_ints(value, count):
    parts = [float(p) for p in value.split(",")]
    if len(parts) != count:
        raise argparse.ArgumentTypeError(f"expected {count} comma-separated numbers")
    return parts


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("image")
    parser.add_argument("--info", action="store_true", help="print image dimensions")
    parser.add_argument("--at", action="append", type=lambda v: parse_ints(v, 2), default=[])
    parser.add_argument("--dominant", nargs="?", const=8, type=int)
    parser.add_argument("--region", type=lambda v: parse_ints(v, 4))
    parser.add_argument("--scale", type=float, default=1.0)
    args = parser.parse_args()

    width, height, pixel = open_image(args.image)
    s = args.scale

    if args.info:
        print(f"{width}x{height} image px; {width / s:.0f}x{height / s:.0f} CSS px at scale {s}")

    for x, y in args.at:
        px, py = int(x * s), int(y * s)
        if not (0 <= px < width and 0 <= py < height):
            print(f"{x:g},{y:g}: out of bounds")
            continue
        print(f"{x:g},{y:g}: {to_hex(pixel(px, py))}")

    if args.dominant:
        if args.region:
            rx, ry, rw, rh = (int(v * s) for v in args.region)
        else:
            rx, ry, rw, rh = 0, 0, width, height
        step = max(1, int(min(rw, rh) / 200))
        counts = Counter()
        for y in range(max(0, ry), min(height, ry + rh), step):
            for x in range(max(0, rx), min(width, rx + rw), step):
                r, g, b = pixel(x, y)
                counts[(r & 0xFC, g & 0xFC, b & 0xFC)] += 1
        total = sum(counts.values()) or 1
        for rgb, n in counts.most_common(args.dominant):
            print(f"{to_hex(rgb)}  {100 * n / total:5.1f}%")


if __name__ == "__main__":
    main()
