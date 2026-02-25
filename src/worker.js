import { PDFDocument } from "pdf-lib";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "modu-pdf-api" });
    }

    if (request.method === "GET" && url.pathname === "/openapi.json") {
      return json(openApiSpec(request), 200, {
        "Cache-Control": "no-store",
      });
    }

    if (request.method === "POST" && url.pathname === "/api/merge") {
      return handleMerge(request);
    }

    if (request.method === "POST" && url.pathname === "/api/optimize") {
      return handleOptimize(request);
    }

    return json(
      {
        error: "Not Found",
        endpoints: ["GET /health", "GET /openapi.json", "POST /api/merge", "POST /api/optimize"],
      },
      404
    );
  },
};

async function handleMerge(request) {
  const form = await request.formData();
  const files = form
    .getAll("files")
    .filter((v) => v instanceof File && v.name.toLowerCase().endsWith(".pdf"));
  const optimize = toBoolean(form.get("optimize"), true);
  const sortMode = String(form.get("sort") || "numeric");

  if (files.length < 2) {
    return json({ error: "Provide at least two PDF files under 'files'." }, 400);
  }

  const ordered = [...files];
  if (sortMode === "numeric") {
    ordered.sort(compareByNumbersInName);
  } else if (sortMode === "name") {
    ordered.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
  } else {
    return json({ error: "Invalid sort. Use 'numeric' or 'name'." }, 400);
  }

  const mergedBytes = await mergePdfFiles(ordered);
  const outputBytes = optimize ? await optimizePdf(mergedBytes) : mergedBytes;
  const outputName = `MODU_Merged_${stripPdf(ordered[0].name)}_to_${stripPdf(ordered[ordered.length - 1].name)}.pdf`;

  return pdfResponse(outputBytes, outputName, {
    "X-MODU-Input-Count": String(ordered.length),
    "X-MODU-Sort": sortMode,
    "X-MODU-Optimized": String(optimize),
  });
}

async function handleOptimize(request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".pdf")) {
    return json({ error: "Provide one PDF file under 'file'." }, 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const optimizedBytes = await optimizePdf(bytes);
  const outputName = `${stripPdf(file.name)}_optimized.pdf`;

  return pdfResponse(optimizedBytes, outputName, {
    "X-MODU-Optimized": "true",
  });
}

async function mergePdfFiles(files) {
  const merged = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }

  return merged.save({ useObjectStreams: true });
}

async function optimizePdf(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.save({ useObjectStreams: true });
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

function stripPdf(name) {
  return String(name).replace(/\.pdf$/i, "");
}

function toBoolean(value, fallback = false) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const lowered = String(value).toLowerCase().trim();
  if (["1", "true", "yes", "on"].includes(lowered)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(lowered)) {
    return false;
  }
  return fallback;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...extraHeaders,
    },
  });
}

function pdfResponse(bytes, filename, extraHeaders = {}) {
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...extraHeaders,
    },
  });
}

function openApiSpec(request) {
  const base = new URL(request.url).origin;
  return {
    openapi: "3.1.0",
    info: {
      title: "MODU PDF API",
      version: "1.0.0",
      description: "Stateless API for PDF merge and lossless optimization.",
    },
    servers: [{ url: base }],
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          responses: {
            "200": { description: "OK" },
          },
        },
      },
      "/api/merge": {
        post: {
          summary: "Merge PDFs",
          description: "Upload multiple files as multipart form-data under `files`.",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    files: {
                      type: "array",
                      items: { type: "string", format: "binary" },
                    },
                    sort: { type: "string", enum: ["numeric", "name"], default: "numeric" },
                    optimize: { type: "boolean", default: true },
                  },
                  required: ["files"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Merged PDF",
              content: {
                "application/pdf": {},
              },
            },
            "400": {
              description: "Invalid request",
              content: {
                "application/json": {},
              },
            },
          },
        },
      },
      "/api/optimize": {
        post: {
          summary: "Lossless optimize one PDF",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    file: { type: "string", format: "binary" },
                  },
                  required: ["file"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Optimized PDF",
              content: {
                "application/pdf": {},
              },
            },
            "400": {
              description: "Invalid request",
              content: {
                "application/json": {},
              },
            },
          },
        },
      },
    },
  };
}
