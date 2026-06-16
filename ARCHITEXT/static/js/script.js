async function generatePlan() {
  const description = document.getElementById("description").value;
  // This looks for 'output' ID first, then falls back to your '.output-canvas' class
  const output =
    document.getElementById("output") ||
    document.querySelector(".output-canvas");
  const btn = document.querySelector(".gen-btn");

  if (!description.trim()) {
    alert("Please enter a room description (e.g., 'Bedroom 12x12')");
    return;
  }

  // 1. Show Loading State
  output.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div class="spinner"></div>
      <p>Architect is thinking...</p>
    </div>
  `;
  if (btn) btn.disabled = true;

  try {
    const response = await fetch("/api/layout/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: description,
        preferences: { units: "metric" }, // Added to match your Python parser
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      output.innerHTML = `<div style="color: #ff4d4d; padding: 20px;">Error: ${data.error}</div>`;
      return;
    }

    // 2. SUCCESS: Inject the SVG directly
    output.classList.add("has-plan");
    output.innerHTML = data.plan.svg;

    // 3. Optional: If you have an explanation div, fill it
    const expDiv = document.querySelector(".exp-card");
    if (expDiv && data.plan.explanation) {
      expDiv.innerHTML = `<h3>Architect's Logic</h3><p>${data.plan.explanation}</p>`;
      expDiv.style.display = "block";
    }
  } catch (error) {
    output.innerHTML = `<div style="color: #ff4d4d; padding: 20px;">Connection failed. Is app.py running?</div>`;
    console.error("Fetch Error:", error);
  } finally {
    if (btn) btn.disabled = false;
  }
}
function showPage(pageId, btn) {
  // 1. Hide all pages
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.remove("active");
    p.style.display = "none";
  });

  // 2. Show the selected page
  const targetPage = document.getElementById("page-" + pageId);
  if (targetPage) {
    targetPage.classList.add("active");
    targetPage.style.display = "block";
  }

  // 3. Update navbar styling
  document
    .querySelectorAll(".nav-item")
    .forEach((nav) => nav.classList.remove("active"));
  if (btn) btn.classList.add("active");
}
