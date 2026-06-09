import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";

export class XaiExecutor extends BaseExecutor {
  constructor() {
    super("xai", PROVIDERS.xai);
  }

  transformRequest(model, body) {
    const effortLevels = ["none", "low", "medium", "high", "xhigh"];
    let out = { ...body };
    let modelEffort = null;

    for (const level of effortLevels) {
      if (out.model && out.model.endsWith(`-${level}`)) {
        modelEffort = level;
        out.model = out.model.replace(`-${level}`, "");
        break;
      }
    }

    if (modelEffort) {
      out.reasoning_effort = modelEffort;
    }
    return out;
  }
}
