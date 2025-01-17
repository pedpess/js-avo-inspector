abstract class PlatformAvoStorage {
  abstract init(shouldLog: boolean, suffix: string): void;
  abstract getItemAsync<T>(key: string): Promise<T | null>;
  abstract getItem<T>(key: string): T | null;
  abstract setItem<T>(key: string, value: T): void;
  abstract removeItem(key: string): void;
  abstract runAfterInit(func: () => void): void;
  abstract isInitialized(): boolean;

  parseJson<T>(maybeItem: string | null | undefined): T | null {
    if (maybeItem !== null && maybeItem !== undefined) {
      return JSON.parse(maybeItem);
    } else {
      return null;
    }
  }
}

class AndroidAvoStorage extends PlatformAvoStorage {
  androidMemoryDataToAvoidAsyncQueries: { [key: string]: string | null } = {};
  AsyncStorage: any | null = null;
  memoryStorageInitialized = false;
  onStorageInitFuncs: Array<() => void> = [];
  reactNative: any | null = null;
  shouldLog: boolean = false;
  suffix: string = "";

  init(shouldLog: boolean, suffix: string) {
    if (!process.env.BROWSER) {
      this.suffix = suffix;

      this.reactNative = require("react-native");

      this.shouldLog = shouldLog;

      this.AsyncStorage = this.reactNative.AsyncStorage;

      this.loadAndroidDataToMemoryToAvoidAsyncQueries(() => {
        this.initializeStorageAndroid();
      });
    }
  }

  private loadAndroidDataToMemoryToAvoidAsyncQueries(onLoaded: () => void) {
    this.AsyncStorage.getAllKeys().then((keys: Array<any>) =>
      this.AsyncStorage.multiGet(keys).then((keyVals: Array<Array<string>>) => {
        if (this.shouldLog) {
          console.log("Avo Inspector: android loaded data from memory");
        }
        keyVals.forEach((keyVal) => {
          let keyInStorage = keyVal[0];
          if (keyInStorage.endsWith(this.suffix)) {
            this.androidMemoryDataToAvoidAsyncQueries[keyInStorage] = keyVal[1];
            if (this.shouldLog) {
              console.log(keyInStorage, keyVal[1]);
            }
          }
        });
        onLoaded();
      })
    );
  }

  private initializeStorageAndroid() {
    this.memoryStorageInitialized = true;
    this.onStorageInitFuncs.forEach((func) => {
      func();
    });
  }

  isInitialized() {
    return this.reactNative && this.memoryStorageInitialized;
  }

  getItemAsync<T>(key: string): Promise<T | null> {
    let maybeItem = this.AsyncStorage.getItem(key + this.suffix);
    return maybeItem.then((storedItem: string | null): T | null => {
      return storedItem != null ? JSON.parse(storedItem) : null;
    });
  }

  getItem<T>(key: string): T | null {
    let maybeItem = this.androidMemoryDataToAvoidAsyncQueries[key + this.suffix];
    return this.parseJson(maybeItem);
  }

  setItem<T>(key: string, value: T): void {
    this.AsyncStorage.setItem(key + this.suffix, JSON.stringify(value));
    this.androidMemoryDataToAvoidAsyncQueries[key + this.suffix] = JSON.stringify(value);
  }

  removeItem(key: string): void {
    this.AsyncStorage.removeItem(key + this.suffix);
    this.androidMemoryDataToAvoidAsyncQueries[key + this.suffix] = null;
  }

  runAfterInit(func: () => void) {
    if (this.memoryStorageInitialized === true) {
      func();
    } else {
      this.onStorageInitFuncs.push(func);
    }
  }
}

class IosAvoStorage extends PlatformAvoStorage {
  reactNative: any | null = null;
  suffix: string = "";

  init(_shouldLog: boolean, suffix: string) {
    if (!process.env.BROWSER) {
      this.suffix = suffix;
      this.reactNative = require("react-native");
    }
  }

  isInitialized() {
    return this.reactNative != null;
  }

  getItemAsync<T>(key: string): Promise<T | null> {
    const Settings = this.reactNative.Settings;
    let maybeItem = Settings.get(key + this.suffix);
    return Promise.resolve(this.parseJson(maybeItem));
  }

  getItem<T>(key: string): T | null {
    const Settings = this.reactNative.Settings;
    let maybeItem = Settings.get(key + this.suffix);
    return this.parseJson(maybeItem);
  }

  setItem<T>(key: string, value: T): void {
    const Settings = this.reactNative.Settings;
    Settings.set({ [key + this.suffix]: JSON.stringify(value) });
  }

  removeItem(key: string): void {
    const Settings = this.reactNative.Settings;
    Settings.set({ [key + this.suffix]: null });
  }

  runAfterInit(func: () => void): void {
    func();
  }
}

class BrowserAvoStorage extends PlatformAvoStorage {
  useFallbackStorage = false;
  fallbackStorage: { [key: string]: string | null } = {};
  storageInitialized = false;
  onStorageInitFuncs: Array<() => void> = [];
  shouldLog: boolean = false;
  suffix: string = "";

  init(shouldLog: boolean, suffix: string) {
    this.shouldLog = shouldLog;
    this.suffix = suffix;
    this.initializeStorageWeb(this.isLocalStorageAvailable());
  }

  private initializeStorageWeb(isLocalStorageAvailable: boolean) {
    this.storageInitialized = true;
    if (isLocalStorageAvailable === false) {
      this.useFallbackStorage = true;
    }
    this.onStorageInitFuncs.forEach((func) => {
      func();
    });
  }

  private isLocalStorageAvailable(): boolean {
    const uid = new Date().toISOString();
    try {
      window.localStorage.setItem(uid, uid);
      if (window.localStorage.getItem(uid) === uid) {
        window.localStorage.removeItem(uid);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  isInitialized() {
    return this.storageInitialized;
  }

  getItemAsync<T>(key: string): Promise<T | null> {
    let thisStorage = this;
    return new Promise(function (resolve, _reject) {
      thisStorage.runAfterInit(() => {
        if (thisStorage.useFallbackStorage === true) {
          let maybeItem = thisStorage.fallbackStorage[key + thisStorage.suffix];
          resolve(thisStorage.parseJson(maybeItem));
        } else {
          if (typeof window !== "undefined") {
            let maybeItem;
            try {
              maybeItem = window.localStorage.getItem(key + thisStorage.suffix);
            } catch (error) {
              if (thisStorage.shouldLog) {
                console.error(
                  "Avo Inspector Storage getItemAsync error:",
                  error
                );
              }
              resolve(null);
            }

            resolve(thisStorage.parseJson(maybeItem));
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  getItem<T>(key: string): T | null {
    let maybeItem;
    if (this.storageInitialized === false) {
      maybeItem = null;
    } else if (this.useFallbackStorage === true) {
      maybeItem = this.fallbackStorage[key + this.suffix];
    } else if (process.env.BROWSER) {
      if (typeof window !== "undefined") {
        try {
          maybeItem = window.localStorage.getItem(key + this.suffix);
        } catch (error) {
          if (this.shouldLog) {
            console.error("Avo Inspector Storage getItem error:", error);
          }
        }
      }
    }

    return this.parseJson(maybeItem);
  }

  setItem<T>(key: string, value: T): void {
    this.runAfterInit(() => {
      if (this.useFallbackStorage === true) {
        this.fallbackStorage[key + this.suffix] = JSON.stringify(value);
      } else {
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(key + this.suffix, JSON.stringify(value));
          } catch (error) {
            if (this.shouldLog) {
              console.error("Avo Inspector Storage setItem error:", error);
            }
          }
        }
      }
    });
  }

  removeItem(key: string): void {
    this.runAfterInit(() => {
      if (this.useFallbackStorage === true) {
        this.fallbackStorage[key + this.suffix] = null;
      } else {
        if (typeof window !== "undefined") {
          try {
            window.localStorage.removeItem(key + this.suffix);
          } catch (error) {
            if (this.shouldLog) {
              console.error("Avo Inspector Storage removeItem error:", error);
            }
          }
        }
      }
    });
  }

  runAfterInit(func: () => void): void {
    if (this.storageInitialized === true) {
      func();
    } else {
      this.onStorageInitFuncs.push(func);
    }
  }
}

export class AvoStorage {
  Platform: string | null = null;

  storageImpl: PlatformAvoStorage;

  constructor(shouldLog: boolean, suffix: string = "") {
    if (!process.env.BROWSER) {
      let reactNative = require("react-native");
      this.Platform = reactNative.Platform.OS;
      if (this.Platform === "android") {
        this.storageImpl = new AndroidAvoStorage();
      } else if (this.Platform === "ios") {
        this.storageImpl = new IosAvoStorage();
      } else {
        throw new Error("Avo Inpector is not supported on " + this.Platform);
      }
    } else {
      this.Platform = "browser";
      this.storageImpl = new BrowserAvoStorage();
    }
    this.storageImpl.init(shouldLog, suffix);
  }

  isInitialized() {
    return this.storageImpl.isInitialized();
  }

  getItemAsync<T>(key: string): Promise<T | null> {
    return this.storageImpl.getItemAsync(key);
  }

  getItem<T>(key: string): T | null {
    return this.storageImpl.getItem(key);
  }

  setItem<T>(key: string, value: T): void {
    this.storageImpl.setItem(key, value);
  }

  removeItem(key: string): void {
    this.storageImpl.removeItem(key);
  }

  runAfterInit(func: () => void): void {
    this.storageImpl.runAfterInit(func);
  }
}
