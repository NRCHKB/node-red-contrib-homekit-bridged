module.exports = function (RED) {
    ("use strict");
    const debug = require("debug")("NRCHKB");
    const HapNodeJS = require("hap-nodejs");

    // Accessory API response data
    let accessoryData = {};

    // Service API response data
    let serviceData = {};

    // Accessory API
    const _initAccessoryAPI = function () {
        debug("Initialize AccessoryAPI");

        // Prepare Accessory data once
        const data = HapNodeJS.Accessory.Categories;

        // Order by key (asc)
        Object.keys(data).sort().forEach(function (key) {
            accessoryData[key] = data[key];
        });

        // Retrieve Accessory Types
        RED.httpAdmin.get(
            "/homekit/accessory/types",
            RED.auth.needsPermission("homekit.read"),
            function (req, res) {
                res.json(accessoryData);
            }
        );
    };

    // Service API
    const _initServiceAPI = function () {
        debug("Initialize ServiceAPI");

        // Prepare Service data once
        const data = {};

        Object.keys(HapNodeJS.Service).forEach(function (key) {
            const val = HapNodeJS.Service[key];
            if (typeof val === "function" && val.hasOwnProperty("UUID")) {
                data[key] = val.UUID;
            }
        });

        // Order by key (asc)
        Object.keys(data).sort().forEach(function (key) {
            serviceData[key] = data[key];
        });

        // Retrieve Service Types
        RED.httpAdmin.get(
            "/homekit/service/types",
            RED.auth.needsPermission("homekit.read"),
            function (req, res) {
                res.json(serviceData);
            }
        );
    };

    // Add padStart to nodejs 7
    if (!String.prototype.padStart) {
        debug("NodeJS is <= 7 so we have to add padStart method for String");

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
