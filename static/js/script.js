async function generatePlan() {
  const description = document.getElementById("description").value;

  const output = document.getElementById("output");

  output.innerHTML = "Generating floor plan...";

  try {
    const response = await fetch("http://127.0.0.1:5000/api/layout/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: description,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      output.innerHTML = `<p>Error: ${data.error}</p>`;
      return;
    }

    // DISPLAY SVG
    output.innerHTML = data.plan.svg;
  } catch (error) {
    output.innerHTML = `<p>Something went wrong.</p>`;

    console.error(error);
  }
}
