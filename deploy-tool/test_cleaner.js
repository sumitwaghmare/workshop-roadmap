/**
 * Logic to clean robocopy output for the UI.
 * Strips source/target roots and redundant markers.
 */
function cleanRobocopyOutput(output, source, target) {
  if (!output) return "";

  // Normalize paths for matching (handle cases where UNC might have different slashes)
  const normSource = source.toLowerCase().replace(/\\/g, "/");
  const normTarget = target.toLowerCase().replace(/\\/g, "/");

  const lines = output.split(/\r?\n/);
  const cleaned = lines.map(line => {
    let l = line.trim();
    if (!l) return null;

    // Normalize line for matching
    let normL = l.toLowerCase().replace(/\\/g, "/");

    // Check if line contains source or target
    let found = false;
    if (normL.includes(normSource)) {
        const idx = normL.indexOf(normSource);
        l = l.substring(0, idx) + l.substring(idx + source.length);
        found = true;
    }
    
    normL = l.toLowerCase().replace(/\\/g, "/");
    if (normL.includes(normTarget)) {
        const idx = normL.indexOf(normTarget);
        l = l.substring(0, idx) + l.substring(idx + target.length);
        found = true;
    }

    if (!found) return l; // Keep original if no path matched (e.g. error message)

    // Clean up markers like "*NEW FILE*  \file.txt" -> "*NEW FILE*  file.txt"
    l = l.replace(/(\*.*?\*\s+)[\\\/]+/, "$1");
    l = l.replace(/^[\\\/]+/, "");
    
    return l.trim();

    return l;
  }).filter(l => l && l.length > 0);

  // Return unique lines to avoid duplicates from multiple robocopy commands
  return [...new Set(cleaned)].join("\n");
}

// Test cases
const source = "\\\\acevs125.acedesigners.co.in\\htdocs\\jetAdminReport-test3";
const target = "\\\\acevs125.acedesigners.co.in\\htdocs\\projeX";

const samples = [
    "                \\\\acevs125.acedesigners.co.in\\htdocs\\projeX\\light_yaml_app_original.php",
    "                \\\\acevs125.acedesigners.co.in\\htdocs\\projeX\\projeX.sql",
    "                \\\\acevs125.acedesigners.co.in\\htdocs\\jetAdminReport-test3\\add_mom.php",
    "                \\\\acevs125.acedesigners.co.in\\htdocs\\jetAdminReport-test3\\partials\\sidebar.php",
    "                *NEW FILE*  \\\\acevs125.acedesigners.co.in\\htdocs\\projeX\\new_file.txt"
];

console.log("Cleaning output...");
const result = cleanRobocopyOutput(samples.join("\n"), source, target);
console.log("--- RESULT ---");
console.log(result);
console.log("--------------");

const expected = [
    "light_yaml_app_original.php",
    "projeX.sql",
    "add_mom.php",
    "partials\\sidebar.php",
    "*NEW FILE*  new_file.txt"
];

const lines = result.split("\n");
let ok = true;
expected.forEach((exp, i) => {
    if (lines[i] !== exp) {
        console.error(`Mismatch at line ${i}: expected "${exp}", got "${lines[i]}"`);
        ok = false;
    }
});

if (ok) console.log("Test Passed!");
else console.log("Test Failed!");
