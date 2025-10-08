/*
 * ESP32 RTC SLOW Memory Reader with Server Upload
 * 
 * Reads RTC SLOW Memory (thesis-validated PUF source) and uploads to 
 * measurement server for analysis.
 * 
 * IMPORTANT: SRAM PUF only changes on POWER CYCLE!
 * - Soft reset (reset button) does NOT change SRAM
 * - For new measurements: Disconnect power, wait 1-2s, reconnect
 * 
 * Useful for:
 * - Collecting PUF measurements (minimum 30 power cycles recommended)
 * - Analyzing stability under different conditions
 * - Generating PUF challenges
 * 
 * Based on thesis methodology: 16 devices, long-term measurements
 * 
 * CONFIGURATION:
 * Option 1: Use config.h (recommended) - copy config.h.example to config.h
 * Option 2: Edit values below directly
 */

#include <WiFi.h>
#include <HTTPClient.h>

// Try to include config.h if it exists
#if __has_include("config.h")
    #include "config.h"
#endif

// ============================================
// CONFIGURATION - Edit if NOT using config.h
// ============================================
#ifndef WIFI_SSID
    #define WIFI_SSID "YOUR_WIFI_SSID"
#endif

#ifndef WIFI_PASSWORD
    #define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#endif

#ifndef MEASUREMENT_SERVER_URL
    #define MEASUREMENT_SERVER_URL "http://192.168.1.100:3000/api/sram"
#endif

#ifndef ESP_DEVICE_ID
    #define ESP_DEVICE_ID 1
#endif

#ifndef SRAM_ADDRESS
    #define SRAM_ADDRESS 0x50000000
#endif

#ifndef SRAM_READ_SIZE
    #define SRAM_READ_SIZE 8192
#endif

// ============================================
// GLOBAL VARIABLES
// ============================================
String sramData = "";
bool uploadDone = false;

// ============================================
// FUNCTIONS
// ============================================

/**
 * Read RTC SLOW Memory and store as hex string
 * 
 * Expected: ~94% stability (thesis-validated)
 */
void readSRAM() {
    unsigned char *ram_buffer = (unsigned char *) ((uint32_t)SRAM_ADDRESS);
    sramData = "";
    
    Serial.println("[INFO] Reading RTC SLOW Memory...");
    
    for (size_t i = 0; i < (size_t)SRAM_READ_SIZE; i++) {
        if (ram_buffer[i] < 0x10) {
            sramData += "0";
        }
        sramData += String(ram_buffer[i], HEX);
    }
    
    Serial.print("      Read ");
    Serial.print((size_t)SRAM_READ_SIZE);
    Serial.println(" bytes from RTC SLOW");
}

/**
 * Upload SRAM data to measurement server
 */
bool uploadToServer() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[ERROR] WiFi not connected");
        return false;
    }
    
    WiFiClient client;
    HTTPClient http;
    
    Serial.println("[INFO] Uploading to server...");
    
    // Begin HTTP connection
    if (!http.begin(client, MEASUREMENT_SERVER_URL)) {
        Serial.println("      ✗ Failed to connect");
        return false;
    }
    
    http.addHeader("Content-Type", "application/json");
    
    // Basic auth (username: esp, password: password)
    // Change credentials on server via env.example
    http.addHeader("Authorization", "Basic ZXNwOnBhc3N3b3Jk");
    
    // Build JSON payload (simplified - no temperature)
    String jsonPayload = "{";
    jsonPayload += "\"espid\":" + String(ESP_DEVICE_ID) + ",";
    jsonPayload += "\"data\":\"" + sramData + "\"";
    jsonPayload += "}";
    
    Serial.print("      Payload size: ");
    Serial.print(jsonPayload.length());
    Serial.println(" bytes");
    
    // Send POST request
    int httpResponseCode = http.POST(jsonPayload);
    
    Serial.print("      Response Code: ");
    Serial.println(httpResponseCode);
    
    // Read response completely before closing
    if (httpResponseCode > 0) {
        String response = http.getString();
        
        if (httpResponseCode == 200) {
            Serial.println("      ✓ Upload successful");
        } else {
            Serial.println("      ✗ Upload failed");
            Serial.print("      Response: ");
            Serial.println(response);
        }
    } else {
        Serial.print("      ✗ HTTP Error: ");
        Serial.println(http.errorToString(httpResponseCode));
    }
    
    // Clean shutdown
    http.end();
    delay(100);  // Give time to close properly
    
    return (httpResponseCode == 200);
}

// ============================================
// MAIN PROGRAM
// ============================================

void setup() {
    Serial.begin(115200);
    delay(100);
    
    Serial.println("\n========================================");
    Serial.println("ESP32 RTC SLOW Memory Reader with Upload");
    Serial.println("========================================");
    Serial.println("");
    Serial.println("IMPORTANT: SRAM PUF only changes on POWER CYCLE!");
    Serial.println("           Soft reset does NOT change SRAM values.");
    Serial.println("           For new measurements: Disconnect power,");
    Serial.println("           wait 1-2 seconds, reconnect power.");
    Serial.println("========================================\n");
    
    // Read RTC SLOW Memory first (before WiFi to avoid interference)
    readSRAM();
    
    // Connect to WiFi
    Serial.println("[INFO] Connecting to WiFi...");
    Serial.print("      SSID: ");
    Serial.println(WIFI_SSID);
    
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n      Connected!");
        Serial.print("      IP: ");
        Serial.println(WiFi.localIP());
        
        // Upload once
        if (uploadToServer()) {
            uploadDone = true;
        }
    } else {
        Serial.println("\n[ERROR] WiFi connection failed!");
    }
    
    Serial.println("\n========================================");
    Serial.println("Upload complete!");
    Serial.println("");
    Serial.println("For next measurement:");
    Serial.println("  1. Disconnect ESP32 power");
    Serial.println("  2. Wait 1-2 seconds");
    Serial.println("  3. Reconnect power");
    Serial.println("  4. New SRAM values will be read & uploaded");
    Serial.println("========================================\n");
}

void loop() {
    // Nothing to do - SRAM only changes on power cycle!
    // Soft reset or waiting doesn't change SRAM values.
    
    if (!uploadDone && WiFi.status() == WL_CONNECTED) {
        // Retry upload if it failed initially
        if (uploadToServer()) {
            uploadDone = true;
        }
    }
    
    delay(5000);
}

