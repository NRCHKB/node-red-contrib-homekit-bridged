("use strict");

var assert = require("assert");
var RED = require("./node-red-mock.js").RED;

describe("homekit", function() {
  describe("#loading", function() {
    it("should load without error", function() {
      require("../homekit.js")(RED);
      assert.ok(true);
    });
  });
});
