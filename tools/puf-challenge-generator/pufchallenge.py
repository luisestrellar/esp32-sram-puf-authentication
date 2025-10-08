#!/usr/bin/env python3
"""
PUF Challenge Generator

This tool analyzes multiple SRAM measurements to identify stable bits
and generates a PUF challenge that can be used for authentication.

Usage:
    python pufchallenge.py -i measurements.txt [-v]

The input file should contain one SRAM measurement per line in hexadecimal format.
"""

import argparse
from hashlib import pbkdf2_hmac

# PBKDF2 Configuration (MUST match ESP32 code!)
# Salt provides domain separation for this application
PBKDF2_ITERATIONS = 10000
PBKDF2_SALT = b"ESP32-SRAM-PUF-Auth-v1"  # MUST match ESP32 exactly!

# Note: You can change this salt for your deployment, but it MUST be
# identical in ESP32 code and all Python scripts!

def hex_to_binary(hex_str):
    """Converts a hex string to a binary string"""
    return bin(int(hex_str, 16))[2:].zfill(len(hex_str) * 4)

def get_first_measurement(file_path):
    """Read the first measurement from file"""
    with open(file_path, 'r') as file:
        return file.readline().strip()

def read_hex_codes(file_path):
    """Reads hex codes from a file and returns them as a list"""
    with open(file_path, 'r') as file:
        return [line.strip() for line in file if line.strip()]

def find_stable_bits(hex_codes):
    """
    Identifies stable bits across all measurements.
    A bit is stable if it doesn't change between consecutive measurements.
    Returns a binary string where '1' = stable bit, '0' = unstable bit
    """
    if len(hex_codes) < 2:
        raise ValueError("Need at least 2 measurements to identify stable bits")
    
    # Convert hex codes to binary
    binary_codes = [hex_to_binary(code) for code in hex_codes]
    
    # Ensure all measurements are the same length
    min_length = min(len(code) for code in binary_codes)
    binary_codes = [code[:min_length] for code in binary_codes]
    
    # Initialize a list to track changes in each bit position
    bit_changes = [0] * len(binary_codes[0])
    
    # Compare each bit to the corresponding bit in the next code
    for i in range(len(binary_codes) - 1):
        for bit_pos in range(len(binary_codes[i])):
            if binary_codes[i][bit_pos] != binary_codes[i+1][bit_pos]:
                bit_changes[bit_pos] = 1
    
    # Construct the challenge: '1' = stable bit, '0' = unstable bit
    stable_bits = ''.join(['1' if x == 0 else '0' for x in bit_changes])
    
    return stable_bits

def extract_bits_from_sram_to_bytearray(binary_challenge, ram_buffer_binary):
    """
    Extract bits from SRAM data using the challenge as a mask.
    Only bits where challenge bit is '1' are extracted.
    """
    extracted_bits = "".join(
        ram_buffer_binary[i] 
        for i in range(len(binary_challenge)) 
        if binary_challenge[i] == '1'
    )
    
    # Convert binary string to bytearray
    result_bytearray = bytearray(
        int(extracted_bits[i:i+8], 2) 
        for i in range(0, len(extracted_bits), 8)
    )
    
    return result_bytearray

def main():
    parser = argparse.ArgumentParser(
        prog='pufchallenge',
        description='Generate a PUF challenge from SRAM measurements',
        epilog='The output provides both the challenge (for ESP32) and the expected API token (for server)'
    )
    
    parser.add_argument(
        '-i', '--input', 
        help='Input file with SRAM measurements (one hex string per line)', 
        required=True
    )
    parser.add_argument(
        '-v', '--verbose', 
        help='Verbose output with debug information', 
        action='store_true'
    )
    parser.add_argument(
        '--challenge-size',
        help='Number of bits to use for challenge (default: 128)',
        type=int,
        default=128
    )
    
    args = parser.parse_args()
    
    # Read measurements
    print(f"[INFO] Reading measurements from: {args.input}")
    hex_codes = read_hex_codes(args.input)
    print(f"[INFO] Found {len(hex_codes)} measurements")
    
    if len(hex_codes) < 2:
        print("[ERROR] Need at least 2 measurements to generate a challenge")
        return 1
    
    # Find stable bits
    print("[INFO] Analyzing bit stability...")
    stable_bits = find_stable_bits(hex_codes)
    stable_count = stable_bits.count('1')
    total_bits = len(stable_bits)
    stability_percent = (stable_count / total_bits) * 100
    
    print(f"[INFO] Stable bits: {stable_count}/{total_bits} ({stability_percent:.2f}%)")
    
    if stable_count < args.challenge_size:
        print(f"[WARNING] Only {stable_count} stable bits found, less than requested {args.challenge_size}")
        print("[WARNING] Consider using fewer challenge bits or collecting more measurements")
    
    # Use first N stable bits as challenge
    binary_challenge = stable_bits[:args.challenge_size]
    
    # Extract bits from first measurement using the challenge
    ram_buffer_binary = hex_to_binary(get_first_measurement(args.input))
    extracted_bytearray = extract_bits_from_sram_to_bytearray(binary_challenge, ram_buffer_binary)
    
    if args.verbose:
        print(f"\n[DEBUG] Challenge (binary): {binary_challenge}")
        print(f"[DEBUG] Extracted bits: {''.join(format(byte, '08b') for byte in extracted_bytearray)}")
        print(f"[DEBUG] Extracted bytes (hex): {''.join('{:02X}'.format(byte) for byte in extracted_bytearray)}")
    
    # Generate PBKDF2 hash (API token)
    pbkdf2_hash = pbkdf2_hmac('sha256', extracted_bytearray, PBKDF2_SALT, PBKDF2_ITERATIONS, dklen=32)
    
    if args.verbose:
        print(f"\n[DEBUG] PBKDF2 Configuration:")
        print(f"[DEBUG]   Algorithm: HMAC-SHA256")
        print(f"[DEBUG]   Iterations: {PBKDF2_ITERATIONS}")
        print(f"[DEBUG]   Salt: {PBKDF2_SALT.hex()}")
        print(f"[DEBUG]   Key Length: 32 bytes")
    
    # Output results
    challenge_hex = hex(int(binary_challenge, 2))[2:].zfill(len(binary_challenge) // 4)
    
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"\n[ESP32]  PUF Challenge:  {challenge_hex}")
    print(f"         (Use this in your ESP32 code)")
    print(f"\n[SERVER] API Token:      {pbkdf2_hash.hex()}")
    print(f"         (Add this to config.js on the server)")
    print("\n" + "=" * 60)
    
    # Provide copy-paste ready snippets
    print("\n[COPY-PASTE] For ESP32 code:")
    print(f'const char* pufChallenge = "{challenge_hex}";')
    
    print("\n[COPY-PASTE] For server config.js:")
    print(f"'{pbkdf2_hash.hex()}': {{")
    print(f"    deviceId: 'ESP32_XXX',")
    print(f"    description: 'Your device description',")
    print(f"    registered: '{__import__('datetime').date.today().isoformat()}'")
    print(f"}},")
    
    return 0

if __name__ == "__main__":
    exit(main())

