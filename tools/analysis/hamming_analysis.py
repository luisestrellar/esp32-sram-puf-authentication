#!/usr/bin/env python3
"""
SRAM PUF Hamming Distance & Weight Analysis

Analyzes SRAM PUF measurements for:
- Hamming distance between measurements
- Hamming weight distribution
- Bit stability over time

Usage:
    python hamming_analysis.py -i measurements.txt -n ESP32_01 [options]
"""

import numpy as np
import argparse
import matplotlib.pyplot as plt

def hex_to_binary(hex_str):
    """Convert a hexadecimal string to binary."""
    binary_str = bin(int(hex_str, 16))[2:]
    return binary_str.zfill(4 * len(hex_str))

def hamming_distance(s1, s2):
    """Calculate the Hamming distance between two binary strings."""
    if len(s1) != len(s2):
        raise ValueError("Strings must be of the same length")
    return sum(el1 != el2 for el1, el2 in zip(s1, s2))

def hamming_weight(s):
    """Calculate the Hamming weight of a binary string (number of 1s)."""
    return s.count('1')

def read_hex_and_convert(filename):
    """Read hexadecimal strings from a file and convert them to binary."""
    with open(filename, 'r') as file:
        hex_strings = [line.strip() for line in file if line.strip()]
    binary_strings = [hex_to_binary(hex_str) for hex_str in hex_strings]
    return binary_strings

def parse_arguments():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description='Analyze SRAM PUF measurements using Hamming distance and weight',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Compare all measurements to the first one
  python hamming_analysis.py -i data.txt -n ESP32_01 -c 1
  
  # Compare consecutive measurements (rolling)
  python hamming_analysis.py -i data.txt -n ESP32_01 -r
  
  # Analyze Hamming weight over time
  python hamming_analysis.py -i data.txt -n ESP32_01 --weight-plot
  
  # Print full comparison matrix
  python hamming_analysis.py -i data.txt
        '''
    )
    
    parser.add_argument('-i', '--input', type=str, required=True, 
                        help='Input file containing hex strings (one per line)')
    parser.add_argument('-n', '--name', type=str, default='Unknown',
                        help='Name/ID of the ESP32 device')
    parser.add_argument('-c', '--compare', type=int, default=None,
                        help='Compare all measurements to a specific measurement number')
    parser.add_argument('-r', '--rolling', action='store_true',
                        help='Compare each measurement to the previous one')
    parser.add_argument('--weight-plot', action='store_true',
                        help='Plot Hamming weight across all measurements')
    parser.add_argument('-w', '--weight-table', action='store_true',
                        help='Print Hamming weight table')
    parser.add_argument('--bits', type=int, default=65536,
                        help='Number of bits in each measurement (default: 65536 = 8KB)')
    parser.add_argument('--save', type=str, default=None,
                        help='Save plot to file instead of showing')
    
    return parser.parse_args()

def print_distance_matrix(distances):
    """Print the Hamming distances in a markdown table format."""
    n = len(distances)
    
    # Print header row
    header = "| # | " + " | ".join(str(i+1) for i in range(n)) + " |"
    print(header)
    print("|---" * (n + 1) + "|")
    
    # Print each row
    for i in range(n):
        row = f"| {i+1} | " + " | ".join(
            distances[i][j] if distances[i][j] is not None else '-' 
            for j in range(n)
        ) + " |"
        print(row)

def plot_distances(distances, plot_type, device_name, save_path=None):
    """Plot Hamming distances or weights."""
    plt.figure(figsize=(14, 6))
    x = list(range(len(distances)))
    
    if plot_type == 'compare':
        plt.plot(x, distances, color="#000000", marker='o', markersize=3)
        plt.xlabel('Measurement Index')
        plt.ylabel('Hamming Distance (%)')
        plt.title(f'Hamming Distance to Initial Measurement | Device: {device_name}')
        plt.grid(True, alpha=0.3)
    
    elif plot_type == 'rolling':
        plt.plot(x, distances, color="#ff0000", marker='o', markersize=3)
        plt.xlabel('Measurement Index')
        plt.ylabel('Hamming Distance (%)')
        plt.title(f'Hamming Distance Between Consecutive Measurements | Device: {device_name}')
        plt.grid(True, alpha=0.3)
    
    elif plot_type == 'weight':
        plt.plot(x, distances, color="#0000ff", marker='o', markersize=3, label='Hamming Weight')
        
        # Add linear regression
        x_np = np.arange(len(distances))
        slope, intercept = np.polyfit(x_np, distances, 1)
        regression = np.poly1d([slope, intercept])
        plt.plot(x_np, regression(x_np), 
                label=f'Linear Fit (slope={slope:.4f})', 
                color='red', linestyle='--', linewidth=2)
        
        plt.xlabel('Measurement Index')
        plt.ylabel('Hamming Weight (%)')
        plt.title(f'Hamming Weight Over Time | Device: {device_name}')
        plt.legend(loc='best')
        plt.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"[INFO] Plot saved to: {save_path}")
    else:
        plt.show()

def main():
    args = parse_arguments()
    
    print(f"[INFO] Reading measurements from: {args.input}")
    binary_strings = read_hex_and_convert(args.input)
    print(f"[INFO] Loaded {len(binary_strings)} measurements")
    
    if len(binary_strings) == 0:
        print("[ERROR] No measurements found in file")
        return 1
    
    # Verify bit length
    actual_bits = len(binary_strings[0])
    if actual_bits != args.bits:
        print(f"[WARNING] Expected {args.bits} bits, found {actual_bits} bits")
        print(f"[INFO] Using {actual_bits} bits for calculations")
        total_bits = actual_bits
    else:
        total_bits = args.bits
    
    # Compare to specific measurement
    if args.compare is not None:
        compare_index = args.compare - 1
        if compare_index < 0 or compare_index >= len(binary_strings):
            print(f"[ERROR] Compare index {args.compare} is out of bounds (1-{len(binary_strings)})")
            return 1
        
        print(f"[INFO] Comparing all measurements to measurement #{args.compare}")
        distances = []
        for i, binary_str in enumerate(binary_strings):
            if i != compare_index:
                dist = round(hamming_distance(binary_strings[compare_index], binary_str) / total_bits * 100, 2)
                distances.append(dist)
        
        avg_dist = np.mean(distances)
        std_dist = np.std(distances)
        print(f"[STATS] Average distance: {avg_dist:.2f}% (±{std_dist:.2f}%)")
        
        plot_distances(distances, 'compare', args.name, args.save)
    
    # Rolling comparison
    elif args.rolling:
        print("[INFO] Computing rolling Hamming distances...")
        distances = []
        for i in range(1, len(binary_strings)):
            dist = round(hamming_distance(binary_strings[i], binary_strings[i-1]) / total_bits * 100, 2)
            distances.append(dist)
        
        avg_dist = np.mean(distances)
        std_dist = np.std(distances)
        print(f"[STATS] Average distance: {avg_dist:.2f}% (±{std_dist:.2f}%)")
        
        plot_distances(distances, 'rolling', args.name, args.save)
    
    # Weight plot
    elif args.weight_plot:
        print("[INFO] Computing Hamming weights...")
        weights = []
        for binary_str in binary_strings:
            weight = round(hamming_weight(binary_str) / total_bits * 100, 2)
            weights.append(weight)
        
        avg_weight = np.mean(weights)
        std_weight = np.std(weights)
        print(f"[STATS] Average weight: {avg_weight:.2f}% (±{std_weight:.2f}%)")
        print(f"[STATS] Expected: ~50% for random SRAM")
        
        plot_distances(weights, 'weight', args.name, args.save)
    
    # Weight table
    elif args.weight_table:
        print("\n| Device | Ones | Zeros | Weight (%) |")
        print("|--------|------|-------|------------|")
        for i, binary_str in enumerate(binary_strings):
            weight = hamming_weight(binary_str)
            weight_pct = round(weight / total_bits * 100, 2)
            print(f"| {args.name}_{i+1} | {weight} | {total_bits - weight} | {weight_pct} |")
    
    # Full distance matrix
    else:
        print("[INFO] Computing full Hamming distance matrix...")
        n = len(binary_strings)
        distances = [[None if i != j else '-' for j in range(n)] for i in range(n)]
        
        for i in range(n):
            for j in range(i+1, n):
                try:
                    dist = round(hamming_distance(binary_strings[i], binary_strings[j]) / total_bits * 100, 2)
                    distances[i][j] = str(dist)
                    distances[j][i] = str(dist)
                except ValueError as e:
                    print(f"[ERROR] {e}")
        
        print("\nHamming Distance Matrix (%):")
        print_distance_matrix(distances)
    
    return 0

if __name__ == "__main__":
    exit(main())

