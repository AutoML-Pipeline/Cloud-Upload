/**
 * Test script for workflow session management
 * Run in browser console to verify sessionStorage functionality
 */

// Test 1: Check if workflow session keys exist
console.log("=== Test 1: Checking sessionStorage keys ===");
const keys = Object.keys(sessionStorage).filter(key => key.startsWith("workflow_session_"));
console.log("Found workflow session keys:", keys);
keys.forEach(key => {
  const data = JSON.parse(sessionStorage.getItem(key));
  console.log(`  ${key}:`, data);
});

// Test 2: Simulate saving workflow state
console.log("\n=== Test 2: Simulating workflow save ===");
const testWorkflowState = {
  data: {
    selectedFile: "test_file.parquet",
    step: "configure_preprocessing",
    preprocessingSteps: {
      removeDuplicates: true,
      removeDuplicatesColumns: ["id"],
      fillNulls: true,
    },
    activePreviewTab: "quality"
  },
  timestamp: new Date().toISOString(),
  version: "v1"
};
sessionStorage.setItem("workflow_session_preprocessing_test_file.parquet_v1", JSON.stringify(testWorkflowState));
console.log("✅ Saved test workflow state");

// Test 3: Verify save
console.log("\n=== Test 3: Verifying saved state ===");
const retrieved = JSON.parse(sessionStorage.getItem("workflow_session_preprocessing_test_file.parquet_v1"));
console.log("Retrieved state:", retrieved);
console.log("Match:", JSON.stringify(testWorkflowState) === JSON.stringify(retrieved) ? "✅ PASS" : "❌ FAIL");

// Test 4: Check timestamp age
console.log("\n=== Test 4: Checking state age ===");
const savedTime = new Date(retrieved.timestamp);
const now = new Date();
const ageMinutes = (now - savedTime) / (1000 * 60);
console.log(`State age: ${ageMinutes.toFixed(2)} minutes`);
console.log(`Fresh state: ${ageMinutes < 60 ? "✅ YES" : "⚠️ STALE (>60 min)"}`);

// Test 5: Cleanup
console.log("\n=== Test 5: Cleanup test data ===");
sessionStorage.removeItem("workflow_session_preprocessing_test_file.parquet_v1");
console.log("✅ Cleaned up test data");

// Test 6: Check for real workflow states
console.log("\n=== Test 6: Real workflow states ===");
const realKeys = Object.keys(sessionStorage).filter(key => 
  key.startsWith("workflow_session_") && 
  !key.includes("test_file")
);
if (realKeys.length > 0) {
  console.log("Found real workflow states:");
  realKeys.forEach(key => {
    const data = JSON.parse(sessionStorage.getItem(key));
    console.log(`  📁 ${key.replace("workflow_session_", "")}`);
    console.log(`     File: ${data.data.selectedFile}`);
    console.log(`     Step: ${data.data.step}`);
    console.log(`     Age: ${((new Date() - new Date(data.timestamp)) / 1000 / 60).toFixed(1)} min`);
  });
} else {
  console.log("ℹ️  No real workflow states found (start a workflow to see them here)");
}

console.log("\n=== All tests completed ===");
console.log("To test in UI:");
console.log("1. Go to /preprocessing, select a file, configure steps");
console.log("2. Refresh the page (F5)");
console.log("3. You should see a 'Resuming your workflow...' toast");
console.log("4. All your selections should be restored");
