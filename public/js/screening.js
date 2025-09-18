// public/js/screening.js
document.addEventListener("DOMContentLoaded", () => {
  const screeningForm = document.getElementById("screeningForm");
  const screeningStatus = document.getElementById("screeningStatus");
  const loadingOverlay = document.getElementById("loadingOverlay");

  if (!screeningForm) {
    console.log("❌ Screening form not found");
    return; // Exit if form doesn't exist
  }

  screeningForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("🔄 Form submitted - starting screening...");

    // ✅ GET SUBMIT BUTTON (multiple selectors for safety)
    const submitButton =
      document.querySelector('button[type="submit"]') ||
      document.getElementById("submitButton") ||
      screeningForm.querySelector("button");

    if (!submitButton) {
      console.error("❌ Submit button not found!");
      return;
    }

    const originalText = submitButton.innerHTML;

    // ✅ SHOW LOADING STATES
    console.log("⏳ Setting loading state...");
    submitButton.innerHTML = "⏳ Processing screening...";
    submitButton.disabled = true;

    if (loadingOverlay) {
      loadingOverlay.style.display = "flex";
      console.log("📊 Loading overlay shown");
    }
    if (screeningStatus) {
      screeningStatus.textContent = "Processing screening…";
      console.log("📝 Status message updated");
    }

    try {
      console.log("📤 Building form data...");

      // ✅ BUILD JSON PAYLOAD
      const formJSON = {};
      new FormData(screeningForm).forEach((value, key) => {
        if (key.includes("[")) {
          const mainKey = key.split("[")[0];
          const subKey = key.match(/\[(\w+)\]/)[1];
          if (!formJSON[mainKey]) formJSON[mainKey] = {};
          formJSON[mainKey][subKey] = value;
        } else if (key === "requiredSkills" || key === "preferredSkills") {
          formJSON[key] = String(value)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else {
          formJSON[key] = value;
        }
      });

      console.log("📋 Form data prepared:", Object.keys(formJSON));
      console.log("📤 Sending request to /screening...");

      // ✅ SEND REQUEST
      const response = await fetch("/screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formJSON),
      });

      console.log("📥 Response received:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      const contentType = response.headers.get("content-type") || "";
      console.log("📄 Content type:", contentType);

      // ✅ HANDLE ERROR RESPONSES
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;

        if (contentType.includes("application/json")) {
          try {
            const err = await response.json();
            errorMessage = err.error || errorMessage;
            console.error("❌ Server error details:", err);
          } catch (jsonError) {
            console.error("❌ Failed to parse error JSON:", jsonError);
          }
        }

        throw new Error(errorMessage);
      }

      // ✅ HANDLE SUCCESS RESPONSES
      if (contentType.includes("application/json")) {
        const data = await response.json();
        console.log("📋 Response data:", data);

        if (data.success) {
          console.log("✅ Success! Redirecting to:", data.resultsUrl);

          // Show success message briefly
          if (screeningStatus) {
            screeningStatus.textContent = "Screening completed! Redirecting...";
          }

          // ✅ IMMEDIATE REDIRECT (remove setTimeout delay)
          window.location.href = data.resultsUrl;

          // ✅ FALLBACK: Force redirect after 2 seconds
          setTimeout(() => {
            if (data.resultsUrl) {
              window.location.replace(data.resultsUrl); // Use replace() as backup
            }
          }, 2000);
        } else {
          throw new Error(data.error || "Unknown server error");
        }
      } else if (contentType.includes("text/html")) {
        console.log("📄 Received HTML response, replacing document...");
        const html = await response.text();
        document.open();
        document.write(html);
        document.close();
      } else {
        throw new Error(`Unexpected response format: ${contentType}`);
      }
    } catch (error) {
      console.error("💥 Request failed:", error);

      // ✅ SHOW ERROR MESSAGE
      const errorMessage = `Error: ${error.message}`;
      if (screeningStatus) {
        screeningStatus.textContent = errorMessage;
      } else {
        alert(errorMessage);
      }
    } finally {
      console.log("🔄 Cleaning up loading states...");

      // ✅ ALWAYS RESTORE BUTTON STATE
      if (submitButton) {
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
        console.log("🔓 Submit button restored");
      }

      // ✅ ALWAYS HIDE LOADING STATES
      if (loadingOverlay) {
        loadingOverlay.style.display = "none";
        console.log("📊 Loading overlay hidden");
      }

      console.log("✅ Cleanup complete");
    }
  });
});
