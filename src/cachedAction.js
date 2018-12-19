export default class CachedAction {
  constructor(action, options) {
    const opts = {
      ...{
        keepAlive: 60 * 1000
      },
      ...options
    };
    this.action = action;
    this.keepAlive = opts.keepAlive;
    this.cache = { time: Number.NEGATIVE_INFINITY };
    this.isBusy = false;
    this.waitingList = [];
  }

  cacheIsAlive() {
    const now = Date.now();
    const delta = now - this.cache.time;
    return delta < this.keepAlive;
  }

  execute(options) {
    const opts = {
      ...{
        force: false
      },
      options
    };
    if (!opts.force && this.cacheIsAlive()) {
      return Promise.resolve(this.cache.result);
    }

    if (!opts.force && this.isBusy) {
      return new Promise((resolve, reject) => {
        this.waitingList.push({ resolve, reject });
      });
    }

    this.isBusy = true;
    return new Promise((resolve, reject) => {
      const _resolve = v => {
        const result = {
          _meta: {
            time: new Date()
          },
          value: v
        };
        resolve(result);
        this.updateCache(result);
      };
      let tmp = this.action();
      if (tmp instanceof Promise) {
        tmp.then(result => {
          _resolve(result);
        });
      } else {
        _resolve(tmp);
      }
      this.isBusy = false;
    });
  }

  updateCache(result) {
    this.cache = {
      time: result._meta.time.getTime(),
      result: { ...result }
    };
    this.cache.result._meta = { ...result._meta, isCache: true };
    this.resolveWaitingList();
  }

  resolveWaitingList() {
    this.waitingList.forEach(({ resolve, reject }) => {
      // TODO: error
      resolve(this.cache.result);
    });
    this.waitingList = [];
  }
}
