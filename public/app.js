import { PDFDocument } from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";

const fileInput = document.getElementById("pdf-input");
const runBtn = document.getElementById("run-btn");
const optimizeCheckbox = document.getElementById("optimize-checkbox");
const orderList = document.getElementById("file-order");
const status = document.getElementById("status");

let sortedFiles = [];

fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files || []).filter((file) =>
    file.name.toLowerCase().endsWith(".pdf")
  );
  sortedFiles = files.sort(compareByNumbersInName);
  renderOrder(sortedFiles);
  runBtn.disabled = sortedFiles.length < 2;
  updateStatus(
    sortedFiles.length < 2
      ? "Select at least two PDFs to begin."
      : `${sortedFiles.length} PDFs ready.`
  );
});

runBtn.addEventListener("click", async () => {
  if (sortedFiles.length < 2) {
    return;
  }

  runBtn.disabled = true;
  updateStatus("Merging PDFs in filename-number order...");

  try {
    const merged = await PDFDocument.create();

    for (const file of sortedFiles) {
      const bytes = await file.arrayBuffer();
      const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    }

    const mergedBytes = await merged.save({ useObjectStreams: true });

    let outputBytes = mergedBytes;
    if (optimizeCheckbox.checked) {
      updateStatus("Applying lossless optimization...");
      const reloaded = await PDFDocument.load(mergedBytes, { ignoreEncryption: true });
      outputBytes = await reloaded.save({ useObjectStreams: true });
    }

    const outputName = buildOutputName(sortedFiles);
    downloadBytes(outputBytes, outputName);
    updateStatus(`Done. Downloaded ${outputName}`);
  } catch (error) {
    console.error(error);
    updateStatus("Could not process one or more files. Check console for details.");
  } finally {
    runBtn.disabled = false;
  }
});

function renderOrder(files) {
  orderList.innerHTML = "";
  for (const file of files) {
    const item = document.createElement("li");
    item.textContent = file.name;
    orderList.append(item);
  }
}

function extractNumbers(name) {
  const matches = name.match(/\d+/g);
  return matches ? matches.map((v) => Number.parseInt(v, 10)) : [];
}

function compareByNumbersInName(a, b) {
  const aNums = extractNumbers(a.name);
  const bNums = extractNumbers(b.name);
  const len = Math.max(aNums.length, bNums.length);

  for (let i = 0; i < len; i += 1) {
    const av = aNums[i];
    const bv = bNums[i];

    if (av === undefined && bv === undefined) {
      break;
    }
    if (av === undefined) {
      return 1;
    }
    if (bv === undefined) {
      return -1;
    }
    if (av !== bv) {
      return av - bv;
    }
  }

  return a.name.localeCompare(b.name, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function buildOutputName(files) {
  const first = stripPdf(files[0].name);
  const last = stripPdf(files[files.length - 1].name);
  return `MODU_Merged_${first}_to_${last}.pdf`;
}

function stripPdf(name) {
  return name.replace(/\.pdf$/i, "");
}

function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function updateStatus(text) {
  status.textContent = text;
}
