#!/usr/bin/env python3
"""
Inter-Device Hamming Distance Analysis

Compares SRAM PUF measurements from different ESP32 devices
to verify uniqueness (inter-device distance should be ~50%).

Usage:
    python compare_devices.py -d /path/to/measurements/
    
The directory should contain one file per device with measurements.
"""

import os
import argparse

def hamming_distance(s1, s2):
    """Calculate the Hamming distance between two binary strings."""
    if len(s1) != len(s2):
        raise ValueError("Strings must be of the same length")
    return sum(el1 != el2 for el1, el2 in zip(s1, s2))

def read_hex_and_convert(filepath):
    """Read hexadecimal strings from a file and convert them to binary."""
    with open(filepath, 'r') as file:
        hex_strings = [line.strip() for line in file if line.strip()]
    
    if not hex_strings:
        return None
    
    # Convert first measurement only
    hex_str = hex_strings[0]
    binary_str = bin(int(hex_str, 16))[2:]
    return binary_str.zfill(4 * len(hex_str))

def print_distance_table(filenames, distances):
    """Print the Hamming distances in a markdown table format."""
    # Print header
    header = "| Device | " + " | ".join(filenames) + " |"
    print(header)
    print("|---" * (len(filenames) + 1) + "|")
    
    # Print rows
    for i, filename in enumerate(filenames):
        row = f"| {filename} | " + " | ".join(
            distances[i][j] if distances[i][j] is not None else '-' 
            for j in range(len(filenames))
        ) + " |"
        print(row)

def main():
    parser = argparse.ArgumentParser(
        description='Compare SRAM PUF measurements from different devices',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Example:
  python compare_devices.py -d ./measurements/
  
Directory structure:
  measurements/
    ├── esp32_01.txt
    ├── esp32_02.txt
    └── esp32_03.txt
        '''
    )
    
    parser.add_argument('-d', '--directory', type=str, required=True,
                        help='Directory containing measurement files (one per device)')
    
    args = parser.parse_args()
    
    # Get all files in directory
    if not os.path.isdir(args.directory):
        print(f"[ERROR] Directory not found: {args.directory}")
        return 1
    
    files = [f for f in os.listdir(args.directory) 
             if os.path.isfile(os.path.join(args.directory, f)) and not f.startswith('.')]
    
    if len(files) < 2:
        print(f"[ERROR] Need at least 2 device files, found {len(files)}")
        return 1
    
    print(f"[INFO] Found {len(files)} device files")
    
    # Read measurements from each file
    filenames = []
    binary_strings = {}
    
    for filename in files:
        filepath = os.path.join(args.directory, filename)
        print(f"[INFO] Reading: {filename}")
        
        binary = read_hex_and_convert(filepath)
        if binary is None:
            print(f"[WARNING] Skipping empty file: {filename}")
            continue
        
        filenames.append(filename)
        binary_strings[filename] = binary
    
    if len(filenames) < 2:
        print("[ERROR] Not enough valid device files")
        return 1
    
    # Calculate distances
    print(f"\n[INFO] Computing inter-device Hamming distances...")
    
    n = len(filenames)
    bit_length = len(binary_strings[filenames[0]])
    distances = [[None for _ in range(n)] for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            if i == j:
                distances[i][j] = '-'
            elif i < j:
                dist = hamming_distance(
                    binary_strings[filenames[i]], 
                    binary_strings[filenames[j]]
                )
                dist_pct = round(dist / bit_length * 100, 2)
                distances[i][j] = str(dist_pct)
                distances[j][i] = str(dist_pct)
    
    # Print results
    print("\nInter-Device Hamming Distance Matrix (%):")
    print("(Values should be close to 50% for good PUF uniqueness)\n")
    print_distance_table(filenames, distances)
    
    # Calculate statistics
    all_distances = []
    for i in range(n):
        for j in range(i+1, n):
            if distances[i][j] != '-':
                all_distances.append(float(distances[i][j]))
    
    if all_distances:
        avg = sum(all_distances) / len(all_distances)
        print(f"\n[STATS] Average inter-device distance: {avg:.2f}%")
        print(f"[STATS] Expected for good PUF: ~50%")
        
        if avg < 40:
            print("[WARNING] Low inter-device distance - devices may not be unique enough!")
        elif avg > 60:
            print("[WARNING] High inter-device distance - check for systematic bias")
        else:
            print("[OK] Inter-device distance looks good!")
    
    return 0

if __name__ == "__main__":
    exit(main())

