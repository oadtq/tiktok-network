/**
 * Storage Integration Test
 *
 * Run with: npx tsx src/__tests__/storage.integration.ts
 */
import { createStorageFromEnv } from "../client.js";

async function runTests() {
  console.log("🧪 Running Storage Integration Tests\n");

  let passed = 0;
  let failed = 0;

  const storage = createStorageFromEnv();

  // Test 1: Generate Key
  try {
    const key = storage.generateKey("test", "my file.mp4");
    const regex = /^test\/\d+-[a-z0-9]+-my_file\.mp4$/;
    if (regex.test(key)) {
      console.log("✅ Test 1: generateKey works correctly");
      passed++;
    } else {
      console.log(`❌ Test 1: generateKey failed. Got: ${key}`);
      failed++;
    }
  } catch (e) {
    console.log(
      `❌ Test 1: generateKey threw error: ${e instanceof Error ? e.message : String(e)}`,
    );
    failed++;
  }

  // Test 2: Get Public URL
  try {
    const url = storage.getPublicUrl("test/file.mp4");
    if (url.includes("test/file.mp4")) {
      console.log("✅ Test 2: getPublicUrl works correctly");
      passed++;
    } else {
      console.log(`❌ Test 2: getPublicUrl failed. Got: ${url}`);
      failed++;
    }
  } catch (e) {
    console.log(
      `❌ Test 2: getPublicUrl threw error: ${e instanceof Error ? e.message : String(e)}`,
    );
    failed++;
  }

  // Test 3: Upload a file
  try {
    const testData = Buffer.from("Hello, this is a test file content!");
    const key = storage.generateKey("integration-tests", "test-file.txt");

    const result = await storage.upload(key, testData, "text/plain");

    if (result.key === key && result.size === testData.length) {
      console.log("✅ Test 3: upload works correctly");
      console.log(`   - Key: ${result.key}`);
      console.log(`   - URL: ${result.url}`);
      console.log(`   - Size: ${result.size} bytes`);
      passed++;

      // Clean up
      await storage.delete(key);
      console.log("   - Cleaned up test file");
    } else {
      console.log(
        `❌ Test 3: upload failed. Result: ${JSON.stringify(result)}`,
      );
      failed++;
    }
  } catch (e) {
    console.log(
      `❌ Test 3: upload threw error: ${e instanceof Error ? e.message : String(e)}`,
    );
    failed++;
  }

  // Test 4: Get presigned upload URL
  try {
    const key = storage.generateKey("integration-tests", "presigned-test.txt");
    const result = await storage.getPresignedUploadUrl(key, "text/plain", 3600);

    if (result.url && result.expiresAt instanceof Date) {
      console.log("✅ Test 4: getPresignedUploadUrl works correctly");
      console.log(`   - Expires at: ${result.expiresAt.toISOString()}`);
      passed++;
    } else {
      console.log(`❌ Test 4: getPresignedUploadUrl failed`);
      failed++;
    }
  } catch (e) {
    console.log(
      `❌ Test 4: getPresignedUploadUrl threw error: ${e instanceof Error ? e.message : String(e)}`,
    );
    failed++;
  }

  // Test 5: Upload video
  try {
    const videoData = Buffer.from("fake video content for testing");

    const result = await storage.uploadVideo(
      "test-user",
      "test-clip.mp4",
      videoData,
    );

    if (
      result.key.includes("clips/test-user") &&
      result.key.includes("test-clip.mp4")
    ) {
      console.log("✅ Test 5: uploadVideo works correctly");
      console.log(`   - Key: ${result.key}`);
      passed++;

      // Test presigned download URL
      const downloadUrl = await storage.getPresignedDownloadUrl(result.key);
      if (downloadUrl.url) {
        console.log("   - Presigned download URL generated successfully");
      }

      // Clean up
      await storage.delete(result.key);
      console.log("   - Cleaned up test video");
    } else {
      console.log(`❌ Test 5: uploadVideo failed. Key: ${result.key}`);
      failed++;
    }
  } catch (e) {
    console.log(
      `❌ Test 5: uploadVideo threw error: ${e instanceof Error ? e.message : String(e)}`,
    );
    failed++;
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test runner failed:", e);
  process.exit(1);
});
