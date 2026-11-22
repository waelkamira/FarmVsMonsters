export const AUTO_RIG_WORKER_PROTOCOL_VERSION = 1;

const CAPABILITIES = ["part-detection", "prompted-segmentation", "visible-donor-reconstruction"];

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeAutoRigWorkerCapabilities(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Auto-Rig worker capabilities must be an object.");
  }
  if (Number(input.protocolVersion) !== AUTO_RIG_WORKER_PROTOCOL_VERSION) {
    throw new RangeError("Unsupported Auto-Rig worker protocol version.");
  }
  const available = Array.isArray(input.capabilities) ? input.capabilities : [];
  const capabilities = [...new Set(available.filter((value) => CAPABILITIES.includes(value)))].sort();
  const models = Array.isArray(input.models) ? input.models : [];
  return {
    protocolVersion: AUTO_RIG_WORKER_PROTOCOL_VERSION,
    status: input.status === "ready" ? "ready" : "degraded",
    device: ["cpu", "cuda", "mps", "unknown"].includes(input.device) ? input.device : "unknown",
    capabilities,
    models: models.filter((model) => model && typeof model.id === "string" && typeof model.version === "string")
      .map((model) => ({ id: model.id.slice(0, 100), version: model.version.slice(0, 60), license: typeof model.license === "string" ? model.license.slice(0, 120) : null })),
    warnings: Array.isArray(input.warnings) ? input.warnings.filter((item) => typeof item === "string").slice(0, 20).map((item) => item.slice(0, 300)) : []
  };
}

export function validateAutoRigWorkerProposal(proposal, canvas) {
  const errors = [];
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    return { valid: false, errors: ["Proposal must be an object."] };
  }
  const width = Number(canvas?.width), height = Number(canvas?.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 4096 || height > 4096) {
    return { valid: false, errors: ["Source canvas dimensions are invalid."] };
  }
  if (typeof proposal.id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,58}$/.test(proposal.id)) errors.push("Proposal ID is invalid.");
  if (typeof proposal.role !== "string" || proposal.role.length < 1 || proposal.role.length > 80) errors.push("Proposal role is invalid.");
  if (proposal.confidence != null && (!finite(proposal.confidence) || proposal.confidence < 0 || proposal.confidence > 1)) errors.push("Proposal confidence must be between 0 and 1.");
  const bounds = proposal.bounds;
  if (!bounds || ![bounds.x, bounds.y, bounds.width, bounds.height].every((value) => Number.isInteger(value)) ||
      bounds.x < 0 || bounds.y < 0 || bounds.width < 1 || bounds.height < 1 ||
      bounds.x + bounds.width > width || bounds.y + bounds.height > height) {
    errors.push("Proposal bounds must fit inside the original source canvas.");
  }
  const mask = proposal.mask;
  if (!mask || mask.kind !== "polygon" || !Array.isArray(mask.points) || mask.points.length < 3 || mask.points.length > 512) {
    errors.push("Proposal must include an editable polygon mask with 3–512 points.");
  } else {
    if (mask.points.some((point) => !point || !finite(point.x) || !finite(point.y) || point.x < 0 || point.y < 0 || point.x > width || point.y > height)) {
      errors.push("Proposal mask contains points outside the original source canvas.");
    } else {
      const area = Math.abs(mask.points.reduce((sum, point, index) => {
        const next = mask.points[(index + 1) % mask.points.length];
        return sum + point.x * next.y - next.x * point.y;
      }, 0) / 2);
      if (area < 1) errors.push("Proposal mask must enclose a non-zero polygon area.");
      if (bounds && [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isInteger) &&
          mask.points.some((point) => point.x < bounds.x || point.y < bounds.y ||
            point.x > bounds.x + bounds.width || point.y > bounds.y + bounds.height)) {
        errors.push("Proposal mask points must fit inside the proposal crop bounds.");
      }
    }
  }
  if (proposal.provenance && (!["model-mask", "sam2", "manual-polygon"].includes(proposal.provenance.segmentation) ||
      !["source", "reconstructed"].includes(proposal.provenance.pixels))) {
    errors.push("Proposal provenance is not recognized.");
  }
  return { valid: errors.length === 0, errors };
}

export function validateAutoRigWorkerResponse(response, canvas) {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return { valid: false, proposals: [], errors: ["Worker response must be an object."] };
  }
  if (Number(response.protocolVersion) !== AUTO_RIG_WORKER_PROTOCOL_VERSION) {
    return { valid: false, proposals: [], errors: ["Worker response protocol version is unsupported."] };
  }
  if (!Array.isArray(response.proposals) || response.proposals.length > 63) {
    return { valid: false, proposals: [], errors: ["Worker must return at most 63 part proposals."] };
  }
  const ids = new Set();
  const errors = [];
  const proposals = [];
  for (const proposal of response.proposals) {
    const result = validateAutoRigWorkerProposal(proposal, canvas);
    if (!result.valid) errors.push(...result.errors);
    else if (ids.has(proposal.id)) errors.push("Worker returned duplicate proposal ID: " + proposal.id + ".");
    else {
      ids.add(proposal.id);
      proposals.push(proposal);
    }
  }
  return { valid: errors.length === 0, proposals: errors.length ? [] : proposals, errors };
}
