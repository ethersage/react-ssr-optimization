"use strict";

const chai = require("chai");
const expect = chai.expect;
const intercept = require("intercept-stdout");

const requireCache = function (env = "production") {
  process.env.NODE_ENV = env;

  return require("../..");
}

const clearRequireCache = function () {
  Object.keys(require.cache).forEach(
    function (key) {
      delete require.cache[key];
    }
  );
};

describe("react-component-cache", function () {
  afterEach(() => {
    clearRequireCache();
  });

  it("should be loaded", () => {
    const reactComponentCache = requireCache();
    reactComponentCache({});
    expect(reactComponentCache).to.be.ok;
  });

  it("should cache components", () => {
    const reactComponentCache = requireCache();
    let renderCount = 0;
    reactComponentCache({
      components: {"HelloWorld": function (props) {return props.text;}}});

    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    class HelloWorld extends React.Component {
      render() {
        renderCount++;
        return React.DOM.div(null, this.props.text);
      }
    }

    // Cache Miss
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    // Cache Hit
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    // Cache Hit
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    // Cache Miss
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));
    expect(renderCount).to.equal(2);
  });

  it("should accept attributes to generate key", () => {
    const reactComponentCache = requireCache();
    let renderCount = 0;
    /* eslint-disable max-params, no-console*/
    reactComponentCache({
      components: {
        "HelloWorld": {
          cacheAttrs: ["text"]
        }
      }
    });
    /* eslint-enable max-params, no-console*/
    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    class HelloWorld extends React.Component {
      render() {
        renderCount++;
        return React.DOM.div(null, this.props.text);
      }
    }

    // Cache Miss
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    // Cache Miss - Not cached
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));
    expect(renderCount).to.equal(2);
    // Cache Hit
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(2);
    // Cache Hit
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));
    expect(renderCount).to.equal(2);
  });

  it("should accept deep attrs for key gen", () => {
    const reactComponentCache = requireCache();
    let renderCount = 0;
    /* eslint-disable max-params, no-console*/
    reactComponentCache({
      components: {
        "HelloWorld": {
          cacheAttrs: ["data.text"]
        }
      }
    });
    /* eslint-enable max-params, no-console*/
    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    class HelloWorld extends React.Component {
      render() {
        renderCount++;
        return React.DOM.div(null, this.props.data.text);
      }
    }

    const props1 = {data: { text: "Hello World X!"}};
    const props2 = {data: { text: "Hello World Y!"}};

    // Cache Miss
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)(props1))).to.contains("Hello World X!");
    expect(renderCount).to.equal(1);
    // Cache Miss
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)(props2))).to.contains("Hello World Y!");
    expect(renderCount).to.equal(2);
    // Cache Hit
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)(props1))).to.contains("Hello World X!");
    expect(renderCount).to.equal(2);
    // Cache Hit
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)(props2))).to.contains("Hello World Y!");
    expect(renderCount).to.equal(2);
  });

  it("should cache components only when key is not null", () => {
    const reactComponentCache = requireCache();
    let renderCount = 0;
    reactComponentCache({
      components: {
        "HelloWorld": {
          cacheKeyGen: function (props) {
            // Only cache when "X" is in the text
            return props.text.indexOf("X") > -1 ? props.text : null;
          }
        }
      }});

    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    class HelloWorld extends React.Component {
      render() {
        renderCount++;
        return React.DOM.div(null, this.props.text);
      }
    }

    // Cache Miss
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    // Cache Miss - Not cached since cache key function returned null
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));
    expect(renderCount).to.equal(2);
    // Cache Hit
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(2);
    // Cache Miss - Not cached since cache key function returned null
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));
    expect(renderCount).to.equal(3);
  });

  it("should accept custom LRU cache configurations", () => {
    const reactComponentCache = requireCache();

    // Set maximum cache size to 1
    const cacheConfig = {
      max: 1
    };

    let renderCount = 0;
    reactComponentCache({
      components: {"HelloWorld2": function (props) {return props.text;}},
      lruCacheSettings: cacheConfig
    });

    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    class HelloWorld2 extends React.Component {
      render() {
        renderCount++;
        return React.DOM.div(null, this.props.text);
      }
    }

    // Cache Miss
    ReactDomServer.renderToString(React.createFactory(HelloWorld2)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    // Cache Miss
    ReactDomServer.renderToString(React.createFactory(HelloWorld2)({text: "Hello World Y!"}));
    expect(renderCount).to.equal(2);
    // Cache Miss since cache size is 1
    ReactDomServer.renderToString(React.createFactory(HelloWorld2)({text: "Hello World X!"}));
    expect(renderCount).to.equal(3);
    // Cache Hit
    ReactDomServer.renderToString(React.createFactory(HelloWorld2)({text: "Hello World X!"}));
    expect(renderCount).to.equal(3);
  });

  it("should accept template configurations", () => {
    const reactComponentCache = requireCache();

    let renderCount = 0;
    /* eslint-disable max-params, no-console*/
    reactComponentCache({
      components: {
        "HelloWorld": {
          templateAttrs: ["text"]
        }
      }
    });
    /* eslint-enable max-params, no-console*/
    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    class HelloWorld extends React.Component {
      render() {
        renderCount++;
        return React.DOM.div(null, this.props.text);
      }
    }

    // Cache Miss
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}))).to.contains("Hello World X!");
    expect(renderCount).to.equal(1);
    // Cache Hit since it is templatized
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}))).to.contains("Hello World Y!");
    expect(renderCount).to.equal(1);
    // Cache Hit
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}))).to.contains("Hello World X!");
    expect(renderCount).to.equal(1);
    // Cache Hit
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}))).to.contains("Hello World X!");
    expect(renderCount).to.equal(1);
  });

  it("should accept template configurations with cache key attribute", () => {
    const reactComponentCache = requireCache();

    let renderCount = 0;
    /* eslint-disable max-params, no-console*/
    reactComponentCache({
      components: {
        "HelloWorld": {
          cacheAttrs: ["flags"],
          templateAttrs: ["text"]
        }
      }
    });
    /* eslint-enable max-params, no-console*/
    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    class HelloWorld extends React.Component {
      render() {
        renderCount++;
        return this.props.flags && this.props.flags.bold ? React.DOM.h1(null, this.props.text) : React.DOM.div(null, this.props.text);
      }
    }

    let markup = ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(markup).to.contains("Hello World X!");
    expect(markup).to.contains("<div");
    expect(renderCount).to.equal(1);

    markup = ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!", flags: {bold: true}}));
    expect(markup).to.contains("Hello World X!");
    expect(markup).to.contains("<h1");
    expect(renderCount).to.equal(2);

    //additional calls to renderToString to verify cache is hit
    markup = ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(markup).to.contains("Hello World X!");
    expect(markup).to.contains("<div");
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}))).to.contains("Hello World X!");
    expect(renderCount).to.equal(2);
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}))).to.contains("Hello World Y!");
    expect(renderCount).to.equal(2);
  });

  it("should accept custom template configurations for deep attrs", () => {
    const reactComponentCache = requireCache();

    let renderCount = 0;
    /* eslint-disable max-params, no-console*/
    reactComponentCache({
      components: {
        "HelloWorld": {
          templateAttrs: ["data.text"]
        }
      }
    });
    /* eslint-enable max-params, no-console*/
    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    class HelloWorld extends React.Component {
      render() {
        renderCount++;
        return React.DOM.div(null, this.props.data.text);
      }
    }

    // Cache Miss
    let props = {data: { text: "Hello World X!"}};
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)(props))).to.contains("Hello World X!");
    expect(props.data.text).to.equal("Hello World X!");
    expect(renderCount).to.equal(1);

    // Cache Hit
    props = {data: { text: "Hello World Y!"}};
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)(props))).to.contains("Hello World Y!");
    expect(props.data.text).to.equal("Hello World Y!");
    expect(renderCount).to.equal(1);
  });

  it("should templatize properly even when prop names overlap with '_'", () => {
    /*eslint-disable camelcase*/
    const reactComponentCache = requireCache();

    let renderCount = 0;
    /* eslint-disable max-params, no-console*/
    reactComponentCache({
      components: {
        "HelloWorld": {
          templateAttrs: ["foo.bar", "foo_bar"]
        }
      }
    });
    /* eslint-enable max-params, no-console*/
    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    class HelloWorld extends React.Component {
      render() {
        renderCount++;
        const child = React.DOM.div(null, this.props.foo.bar);
        return React.DOM.div(null, this.props.foo_bar, child);
      }
    }

    const props = {foo: {bar: "Hello World X!"}, foo_bar: "Hello World Y!"};
    // Cache Miss
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)(props))).to.contains("Hello World X!");
    expect(renderCount).to.equal(1);
    // Cache Hit
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)(props))).to.contains("Hello World Y!");
    expect(renderCount).to.equal(1);
    /*eslint-enable camelcase*/
  });

  it("should accept object attributes for templating", () => {
    const reactComponentCache = requireCache();

    let renderCount = 0;
    /* eslint-disable max-params, no-console*/
    reactComponentCache({
      components: {
        "HelloWorld": {
          templateAttrs: ["data"]
        }
      }
    });
    /* eslint-enable max-params, no-console*/
    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    class HelloWorld extends React.Component {
      render() {
        renderCount++;
        return React.DOM.div(null, this.props.data.text);
      }
    }

    // Cache Miss
    let props = {data: { text: "Hello World X!"}};
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)(props))).to.contains("Hello World X!");
    expect(props.data.text).to.equal("Hello World X!");
    expect(renderCount).to.equal(1);

    // Cache Hit
    props = {data: { text: "Hello World Y!"}};
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)(props))).to.contains("Hello World Y!");
    expect(props.data.text).to.equal("Hello World Y!");
    expect(renderCount).to.equal(1);
  });

  it("should accept array ref for templating", () => {
    const reactComponentCache = requireCache();

    let renderCount = 0;
    /* eslint-disable max-params, no-console*/
    reactComponentCache({
      components: {
        "HelloWorld": {
          templateAttrs: ["data"]
        }
      }
    });
    /* eslint-enable max-params, no-console*/
    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    class HelloWorld extends React.Component {
      render() {
        renderCount++;
        const str = `${this.props.data[0]} ${this.props.data[1]}`;
        return React.DOM.div(null, str);
      }
    }

    // Cache Miss
    let props = {data: ["Hello World", "X!"]};
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)(props))).to.contains("Hello World X!");
    expect(props.data.length).to.equal(2);
    expect(renderCount).to.equal(1);

    // Cache Hit
    props = {data: ["Hello World", "Y!"]};
    expect(ReactDomServer.renderToString(React.createFactory(HelloWorld)(props))).to.contains("Hello World Y!");
    expect(props.data.length).to.equal(2);
    expect(renderCount).to.equal(1);
  });

  it("should accept a custom cache implementation", () => {
    const reactComponentCache = requireCache();

    let renderCount = 0;
    let getCount = 0;
    let setCount = 0;

    const cache = {
      _cache: {},
      get: function (key) {
        getCount++;
        return this._cache[key];
      },
      set: function (key, value) {
        setCount++;
        this._cache[key] = value;
      }
    };
    reactComponentCache({
      components: {"HelloWorld": function (props) {return props.text;}},
      cacheImpl: cache
    });
    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    class HelloWorld extends React.Component {
      render() {
        renderCount++;
        return React.DOM.div(null, this.props.text);
      }
    }

    // Cache Miss
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    expect(getCount).to.equal(1);
    expect(setCount).to.equal(1);
    // Cache Hit
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    expect(getCount).to.equal(2);
    expect(setCount).to.equal(1);
    // Cache Hit
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    expect(getCount).to.equal(3);
    expect(setCount).to.equal(1);
    // Cache Miss
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));
    expect(renderCount).to.equal(2);
    expect(getCount).to.equal(4);
    expect(setCount).to.equal(2);
  });

  it("should cache with react classes using displayName", () => {
    const reactComponentCache = requireCache();
    reactComponentCache({
      components: {"HelloDisplayName": function (props) {return props.text;}}});
    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    let renderCount = 0;
    const HelloWorld = React.createClass({
      displayName: "HelloDisplayName",
      render: function () {
        renderCount++;
        return React.DOM.div(null, this.props.text);
      }
    });

    //Cache Miss
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    //Cache Hit
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    //Cache Hit
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    //Cache Miss
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));
    expect(renderCount).to.equal(2);
  });

  it("can be instantiated with caching disabled but later enabled and disabled again", () => {
    const reactComponentCache = requireCache();

    let renderCount = 0;
    const reactComponentCacheRef = reactComponentCache({
      components: {"HelloWorld": function (props) {return props.text;}},
      disabled: true
    });

    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    class HelloWorld extends React.Component {
      render() {
        renderCount++;
        return React.DOM.div(null, this.props.text);
      }
    }

    //Cache disabled - so all cache misses
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(2);
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(3);
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));
    expect(renderCount).to.equal(4);

    renderCount = 0;
    reactComponentCacheRef.enable(true);

    //Cache Miss
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    //Cache Hit
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    //Cache Hit
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    //Cache Miss
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));
    expect(renderCount).to.equal(2);

    renderCount = 0;
    reactComponentCacheRef.enable(false);
    //Cache disabled - so all cache misses
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(1);
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(2);
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    expect(renderCount).to.equal(3);
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));
    expect(renderCount).to.equal(4);
  });

  it("should expose cache functions to get length, reset and dump", () => {
    const reactComponentCache = requireCache();
    const reactComponentCacheRef = reactComponentCache({
      components: {"HelloDisplayName": function (props) {return props.text;}}});
    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    const HelloWorld = React.createClass({
      displayName: "HelloDisplayName",
      render: function () {
        return React.DOM.div(null, this.props.text);
      }
    });

    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));

    expect(reactComponentCacheRef.cacheLength()).to.equal(2);
    reactComponentCacheRef.cacheReset();
    expect(reactComponentCacheRef.cacheDump().length).to.equal(0);
    expect(reactComponentCacheRef.cacheLength()).to.equal(0);
  });

  it("should expose callback to get notified of cache events", (done) => {
    const reactComponentCache = requireCache();
    const cacheStats = {
      hit: 0,
      miss: 0
    };
    reactComponentCache({
      components: {"HelloDisplayName": function (props) {return props.text;}},
      eventCallback: function (e) {
        if (e.type === "cache") {
          if (e.event === "miss") {
            cacheStats.miss++;
          } else if (e.event === "hit") {
            cacheStats.hit++;
          }
        }
      }
    });
    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    const HelloWorld = React.createClass({
      displayName: "HelloDisplayName",
      render: function () {
        return React.DOM.div(null, this.props.text);
      }
    });

    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));

    process.nextTick(() => {
      expect(cacheStats.hit).to.equal(3);
      expect(cacheStats.miss).to.equal(2);
      done();
    });
  });

  it("should expose callback to get notified of cache events with load time", (done) => {
    const reactComponentCache = requireCache();
    const cacheStats = {
      hit: 0,
      miss: 0,
      loadTime: 0
    };
    reactComponentCache({
      components: {"HelloDisplayName": function (props) {return props.text;}},
      eventCallback: function (e) {
        if (e.type === "cache") {
          if (e.event === "miss") {
            cacheStats.miss++;
            cacheStats.loadTime += e.loadTimeNS;
          } else if (e.event === "hit") {
            cacheStats.hit++;
          }
        }
      },
      collectLoadTimeStats: true
    });
    const React = require("react");
    const ReactDomServer = require("react-dom/server");
    const HelloWorld = React.createClass({
      displayName: "HelloDisplayName",
      render: function () {
        return React.DOM.div(null, this.props.text);
      }
    });

    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World X!"}));
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));
    ReactDomServer.renderToString(React.createFactory(HelloWorld)({text: "Hello World Y!"}));

    process.nextTick(() => {
      expect(cacheStats.hit).to.equal(3);
      expect(cacheStats.miss).to.equal(2);
      expect(cacheStats.loadTime).to.be.above(0);
      done();
    });
  });

  it("should not load in non-production by default", () => {
    const reactComponentCache = requireCache("test");
    let log;
    const unhook = intercept((txt) => {
      log = txt;
    });
    reactComponentCache({});
    unhook();
    expect(log).to.be.ok;
    expect(log).contains("Caching is disabled in non-production environments");
  });

  it("should load in a non-prod environment specified by a string", () => {
    const reactComponentCache = requireCache("notproduction");
    let log;
    const unhook = intercept((txt) => {
      log = txt;
    });
    reactComponentCache({
      env: "notproduction"
    });
    unhook();
    expect(log).to.not.be.ok;
  });

  it("should load in a single not-prod environment", () => {
    const reactComponentCache = requireCache("notproduction");
    let log;
    const unhook = intercept((txt) => {
      log = txt;
    });
    reactComponentCache({
      env: ["notproduction"]
    });
    unhook();
    expect(log).to.not.be.ok;
  });

  it("should load in production with a non-prod environment specified by a string", () => {
    const reactComponentCache = requireCache("production");
    let log;
    const unhook = intercept((txt) => {
      log = txt;
    });
    reactComponentCache({
      env: "notproduction"
    });
    unhook();
    expect(log).to.not.be.ok;
  });

  it("should load in production with a single non-prod environment", () => {
    const reactComponentCache = requireCache("production");
    let log;
    const unhook = intercept((txt) => {
      log = txt;
    });
    reactComponentCache({
      env: ["notproduction"]
    });
    unhook();
    expect(log).to.not.be.ok;
  });

  it("should load in production with multiple non-prod environments", () => {
    const reactComponentCache = requireCache("production");
    let log;
    const unhook = intercept((txt) => {
      log = txt;
    });
    reactComponentCache({
      env: ["notproduction", "alsonotproduction"]
    });
    unhook();
    expect(log).to.not.be.ok;
  });

  it("should not load in non-production by default", () => {
    const reactComponentCache = requireCache("notproduction");
    let log;
    const unhook = intercept((txt) => {
      log = txt;
    });
    reactComponentCache({});
    unhook();
    expect(log).to.be.ok;
    expect(log).contains("Caching is disabled in non-production environments");
  });

  it("should not load in unmatched non-production with a non-prod environment specified by a string", () => {
    const reactComponentCache = requireCache("alsonotproduction");
    let log;
    const unhook = intercept((txt) => {
      log = txt;
    });
    reactComponentCache({
      env: "notproduction"
    });
    unhook();
    expect(log).to.be.ok;
    expect(log).contains("Caching is disabled in non-production environments");
  });

  it("should not load in unmatched non-production with a single non-prod environment", () => {
    const reactComponentCache = requireCache("alsonotproduction");
    let log;
    const unhook = intercept((txt) => {
      log = txt;
    });
    reactComponentCache({
      env: ["notproduction"]
    });
    unhook();
    expect(log).to.be.ok;
    expect(log).contains("Caching is disabled in non-production environments");
  });

  it("should not load in unmatched non-production with multiple non-prod environments", () => {
    const reactComponentCache = requireCache("reallynotproduction");
    let log;
    const unhook = intercept((txt) => {
      log = txt;
    });
    reactComponentCache({
      env: ["notproduction", "alsonotproduction"]
    });
    unhook();
    expect(log).to.be.ok;
    expect(log).contains("Caching is disabled in non-production environments");
  });
});
