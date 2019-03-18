module.exports = function(RED) {
    ("use strict");
    const debug = require("debug")("NRCHKB");
    const HapNodeJS = require("hap-nodejs");

    // Accessory API
    const _initAccessoryAPI = function () {
        // Retrieve Accessory Types
        RED.httpAdmin.get(
            "/homekit/accessory/types",
            RED.auth.needsPermission("homekit.read"),
            function (req, res) {
                res.json(HapNodeJS.Accessory.Categories);
            }
        );
    };

    // Service API
    const _initServiceAPI = function () {
        // Retrieve Service Types
        RED.httpAdmin.get(
            "/homekit/service/types",
            RED.auth.needsPermission("homekit.read"),
            function (req, res) {
                const data = {};
                Object.keys(HapNodeJS.Service).forEach(function (key) {
                    const val = HapNodeJS.Service[key];
                    if (typeof val === "function" && val.hasOwnProperty("UUID")) {
                        data[key] = val.UUID;
                    }
                });
                res.json(data);
            }
        );
    };

    // Add padStart to nodejs 7
    if (!String.prototype.padStart) {
        String.prototype.padStart = function padStart(targetLength, padString) {
            targetLength = targetLength >> 0; //truncate if number, or convert non-number to 0;
            padString = String(typeof padString !== "undefined" ? padString : " ");
            if (this.length >= targetLength) {
                return String(this);
            } else {
                targetLength = targetLength - this.length;
                if (targetLength > padString.length) {
                    padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
                }
                return padString.slice(0, targetLength) + String(this);
            }
        };
    }

    const init = function () {
        _initAccessoryAPI();
        _initServiceAPI();
    };

    return {
        init: init,
        _: {
            initAccessoryAPI: _initAccessoryAPI,
            initServiceAPI: _initServiceAPI
        }
    };
};
