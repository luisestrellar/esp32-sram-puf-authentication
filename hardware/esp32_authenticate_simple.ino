/*
 * ESP32 SRAM PUF Authentication
 * 
 * Demonstrates RTC SLOW Memory PUF authentication using bit-selection
 * approach (no error correction needed - selects naturally stable bits).
 * 
 * Features:
 * - Reads ESP32 RTC SLOW Memory (hardware fingerprint)
 * - Selects stable bits using PUF challenge
 * - Generates authentication token via PBKDF2
 * - Authenticates to server via HTTP Bearer token
 * 
 * CONFIGURATION:
 * Option 1: Use config.h (recommended) - copy config.h.example to config.h
 * Option 2: Edit values below directly
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <mbedtls/pkcs5.h>
#include "mbedtls/md.h"

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

#ifndef AUTH_SERVER_URL
    #define AUTH_SERVER_URL "http://192.168.1.100:8080/"
#endif

#ifndef PUF_CHALLENGE
    #define PUF_CHALLENGE "f3f3dfffefbabffff3fbff7fb6efbeff"
#endif

#ifndef SRAM_ADDRESS
    #define SRAM_ADDRESS 0x50000000
#endif

#ifndef SRAM_READ_SIZE
    #define SRAM_READ_SIZE 128  // Optimal for auth (sufficient for challenge extraction)
#endif

#ifndef PBKDF2_SALT
    #define PBKDF2_SALT "ESP32-SRAM-PUF-Auth-v1"
#endif

#ifndef PBKDF2_ITERATIONS
    #define PBKDF2_ITERATIONS 10000
#endif

#ifndef PBKDF2_KEY_LENGTH
    #define PBKDF2_KEY_LENGTH 32
#endif

// ============================================
// GLOBAL VARIABLES
// ============================================
unsigned char derivedKey[PBKDF2_KEY_LENGTH];
unsigned char *ram_buffer = (unsigned char *) ((uint32_t)SRAM_ADDRESS);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert a single byte to binary string representation
 */
String byteToBinaryString(byte b) {
    String result = "";
    for (int i = 7; i >= 0; --i) {
        result += (b & (1 << i)) ? "1" : "0";
    }
    return result;
}

/**
 * Convert hexadecimal string to binary string
 */
String hexStringToBinaryString(const String& hex) {
    String binaryString = "";
    for (char c : hex) {
        int num = c <= '9' ? c - '0' : tolower(c) - 'a' + 10;
        for (int i = 3; i >= 0; --i) {
            binaryString += (num & (1 << i)) ? "1" : "0";
        }
    }
    return binaryString;
}

/**
 * Extract stable bits from RTC SLOW Memory using the PUF challenge
 * 
 * Bit-selection approach (no error correction needed):
 * - Challenge acts as a mask selecting stable bits (where challenge bit is '1')
 * - Achieves ~94% stability by selecting naturally stable bits
 * - More secure: no helper data exposure
 */
String extractBitsFromSRAM() {
    String binarySRAM = "";
    
    // Read SRAM and convert to binary
    for (size_t i = 0; i < (size_t)SRAM_READ_SIZE; i++) { 
        binarySRAM += byteToBinaryString(ram_buffer[i]);
    }

    String binaryChallenge = hexStringToBinaryString(PUF_CHALLENGE);
    String extractedBits = "";

    // Extract bits where challenge bit is '1'
    size_t maxLength = min(binaryChallenge.length(), binarySRAM.length());
    for (size_t i = 0; i < maxLength; i++) {
        if (binaryChallenge[i] == '1') {
            extractedBits += binarySRAM[i];
        }
    }

    return extractedBits;
}

/**
 * Convert binary string to byte array for PBKDF2
 */
void binaryStringToByteArray(const String& binaryString, unsigned char* byteArray, size_t& byteArrayLength) {
    byteArrayLength = 0;
    for (size_t i = 0; i < binaryString.length(); i += 8) {
        unsigned char byte = 0;
        for (size_t j = 0; j < 8 && (i + j) < binaryString.length(); ++j) {
            byte <<= 1;
            if (binaryString[i + j] == '1') {
                byte |= 1;
            }
        }
        byteArray[byteArrayLength++] = byte;
    }
}

/**
 * Generate authentication key using PBKDF2-HMAC-SHA256
 * 
 * This derives a cryptographic key from the PUF response.
 * PBKDF2 helps normalize small variations in the PUF response.
 */
bool generatePBKDF2Key(const String& extractedBits) {
    unsigned char password[1024]; 
    size_t passwordLength;

    binaryStringToByteArray(extractedBits, password, passwordLength);

    // Direct PBKDF2 call (ESP32 Arduino Core 3.x compatible)
    const unsigned char salt[] = PBKDF2_SALT;
    
    int ret = mbedtls_pkcs5_pbkdf2_hmac_ext(
        MBEDTLS_MD_SHA256,
        password, passwordLength,
        salt, sizeof(salt) - 1,
        PBKDF2_ITERATIONS, 
        PBKDF2_KEY_LENGTH, 
        derivedKey
    );

    if (ret != 0) {
        Serial.println("[ERROR] PBKDF2: Key generation failed");
        return false;
    }
    
    return true;
}

/**
 * Authenticate with the server using the derived key
 */
bool authenticateWithServer() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[ERROR] WiFi not connected");
        return false;
    }

    WiFiClient client;
    HTTPClient http;

    // Build Bearer token from derived key
    String bearerToken = "Bearer ";
    for (int i = 0; i < PBKDF2_KEY_LENGTH; i++) {
        char hex[3];
        sprintf(hex, "%02x", derivedKey[i]);
        bearerToken += hex;
    }

    Serial.print("[INFO] Bearer Token: ");
    Serial.println(bearerToken);

    // Begin HTTP connection
    if (!http.begin(client, AUTH_SERVER_URL)) {
        Serial.println("[ERROR] Failed to connect to server");
        return false;
    }
    
    http.addHeader("Authorization", bearerToken);
    http.setTimeout(5000);  // 5 second timeout
    
    // Send GET request
    int httpResponseCode = http.GET();

    Serial.print("[INFO] HTTP Response Code: ");
    Serial.println(httpResponseCode);
    
    // Read response completely before closing
    if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.print("[INFO] Response: ");
        Serial.println(response);
    } else {
        Serial.print("[ERROR] HTTP Error: ");
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
    Serial.println("ESP32 RTC SLOW Memory PUF Authentication");
    Serial.println("========================================\n");

    // Step 1: Read RTC SLOW Memory
    Serial.println("[1/4] Reading RTC SLOW Memory...");
    Serial.print("      Address: 0x");
    Serial.println((uint32_t)SRAM_ADDRESS, HEX);
    Serial.print("      Size: ");
    Serial.print((size_t)SRAM_READ_SIZE);
    Serial.println(" bytes");
    Serial.println("      Expected stability: ~94% (thesis)");
    
    // Step 2: Extract PUF bits
    Serial.println("\n[2/4] Extracting PUF bits...");
    String extractedBits = extractBitsFromSRAM();
    Serial.print("      Challenge: ");
    Serial.println(PUF_CHALLENGE);
    Serial.print("      Extracted bits: ");
    Serial.println(extractedBits);
    Serial.print("      Bit count: ");
    Serial.println(extractedBits.length());

    // Step 3: Generate PBKDF2 key
    Serial.println("\n[3/4] Generating PBKDF2 key...");
    Serial.print("      Iterations: ");
    Serial.println(PBKDF2_ITERATIONS);
    
    if (!generatePBKDF2Key(extractedBits)) {
        Serial.println("[ERROR] Failed to generate key!");
        return;
    }
    
    Serial.print("      Derived Key: ");
    for (int i = 0; i < PBKDF2_KEY_LENGTH; i++) {
        Serial.printf("%02x", derivedKey[i]);
    }
    Serial.println();

    // Step 4: Connect to WiFi
    Serial.println("\n[4/4] Connecting to WiFi...");
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
        
        // Authenticate
        Serial.println("\n[AUTH] Attempting authentication...");
        Serial.print("      Server: ");
        Serial.println(AUTH_SERVER_URL);
        
        delay(1000);  // Give server time to be ready
        
        if (authenticateWithServer()) {
            Serial.println("\n✓ AUTHENTICATION SUCCESSFUL!");
        } else {
            Serial.println("\n✗ AUTHENTICATION FAILED!");
        }
    } else {
        Serial.println("\n[ERROR] WiFi connection failed!");
    }
    
    Serial.println("\n========================================");
    Serial.println("Done. Reset ESP32 to try again.");
    Serial.println("========================================\n");
}

void loop() {
    // Nothing to do - authentication happens once in setup()
}

