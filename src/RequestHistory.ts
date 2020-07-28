import isEqual from "lodash.isequal";

interface Request {
  resource: string;
  init: RequestInit;
}

export default class RequestHistory {
  private history: Request[] = [];
  private limit: number;

  getHistory = () => this.history;

  constructor(limit?: number) {
    const savedHistory = localStorage.getItem("requestHistory");
    this.limit = limit !== undefined ? limit : 20;
    if (savedHistory != null) this.history = JSON.parse(savedHistory);
  }

  add(resource: string, init: RequestInit) {
    const request = { resource, init };
    let prevReqIndex: number;
    for (const [i, req] of this.history.entries()) {
      if (isEqual(req, request)) {
        prevReqIndex = i;
        break;
      }
    }
    if (prevReqIndex !== undefined) this.history.splice(prevReqIndex, 1);
    this.history.unshift(request);
    this.history = this.history.slice(0, this.limit);
    localStorage.setItem("requestHistory", JSON.stringify(this.history));
  }

  remove(id: number) {
    this.history.splice(id, 1);
    localStorage.setItem("requestHistory", JSON.stringify(this.history));
  }
}
