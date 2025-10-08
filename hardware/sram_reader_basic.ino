/*
 * ESP32 RTC SLOW Memory Reader - Basic Example
 * 
 * Reads RTC SLOW Memory and prints to serial.
 * Use this to understand how SRAM PUF works and collect measurements.
 * 
 * IMPORTANT: SRAM values only change on POWER CYCLE!
 * - Pressing reset button does NOT change SRAM
 * - For new measurement: Disconnect power, wait 1-2s, reconnect
 * 
 * Expected: ~94% bit stability across power cycles.
 * 
 * No WiFi, no authentication - just pure memory reading.
 */

// Try to include config.h if it exists
#if __has_include("config.h")
    #include "config.h"
#endif

// ============================================
// CONFIGURATION - Edit if NOT using config.h
// ============================================
#ifndef SRAM_ADDRESS
    #define SRAM_ADDRESS 0x50000000
#endif

#ifndef SRAM_READ_SIZE
    #define SRAM_READ_SIZE 8192  // Default: Full 8KB (can use 128 for quick tests)
#endif

// ============================================
// MAIN PROGRAM
// ============================================

void setup() {
    Serial.begin(115200);
    delay(100);
    
    Serial.println("\n========================================");
    Serial.println("ESP32 RTC SLOW Memory PUF Reader");
    Serial.println("========================================\n");
    
    // Point to RTC SLOW Memory (thesis-validated PUF source)
    unsigned char *ram_buffer = (unsigned char *) ((uint32_t)SRAM_ADDRESS);
    
    Serial.println("[INFO] Reading RTC SLOW Memory...");
    Serial.print("      Address: 0x");
    Serial.println((uint32_t)SRAM_ADDRESS, HEX);
    Serial.print("      Size: ");
    Serial.print((size_t)SRAM_READ_SIZE);
    Serial.println(" bytes");
    Serial.println("      Memory: RTC SLOW (PUF-suitable)\n");
    
    Serial.println("[DATA] Memory Contents (Hex):");
    
    // Read and print SRAM contents
    for (size_t i = 0; i < (size_t)SRAM_READ_SIZE; i++) {
        // Print with leading zero if needed
        if (ram_buffer[i] < 0x10) {
            Serial.print("0");
        }
        Serial.print(ram_buffer[i], HEX);
        
        // Add newline every 64 bytes for readability
        if ((i + 1) % 64 == 0) {
            Serial.println();
        }
    }
    
    Serial.println("\n\n========================================");
    Serial.println("Done. Reset ESP32 to read again.");
    Serial.println("TIP: Each reset should show slightly");
    Serial.println("     different values - that's the PUF!");
    Serial.println("========================================\n");
}

void loop() {
    // Nothing to do
}

