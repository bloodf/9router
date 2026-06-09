import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";

export class XaiExecutor extends BaseExecutor {
  constructor() {
    super("xai", PROVIDERS.xai);
  }

  transformRequest(model, body) {
    return body;
  }
}
